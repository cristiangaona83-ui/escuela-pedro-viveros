-- =============================================================================
-- Calendario de asistencia: suspensiones de clases y días recuperados
--
-- Auditoría previa (resumen): no existe ninguna tabla de calendario/feriados/
-- jornadas especiales en el esquema (0001_schema.sql en adelante) -- se
-- verificó por grep exhaustivo. "Días lectivos" hoy se deriva únicamente de
-- fechas distintas con filas en attendance (services/attendance-analytics.ts),
-- no hay una fuente independiente de "qué días correspondía pasar lista".
-- Esta migración agrega esa fuente (2 tablas nuevas) sin tocar attendance ni
-- su lógica de registro diario -- el descuento del denominador se resuelve
-- en la capa de servicio (attendance-analytics.ts), filtrando qué filas de
-- attendance ya existentes se consideran al calcular, nunca borrando ni
-- editando esas filas.
--
-- Tablas nuevas:
--  - class_suspensions: una fila por día suspendido O por día recuperado
--    (kind distingue ambos -- comparten los mismos campos de alcance/curso/
--    documento/auditoría, así que un solo modelo evita duplicar estructura).
--    Alcance "escuela" (todos los cursos) o "cursos" (uno o varios, vía la
--    tabla de enlace). Anulación lógica vía status='anulada' -- sin política
--    de DELETE para esta tabla.
--  - class_suspension_courses: enlace N:N cuando scope='cursos'.
--
-- Cálculo: full_day=true excluye esa fecha del denominador para los cursos
-- afectados (school-wide si scope='escuela', o solo los cursos enlazados).
-- Suspensión parcial (full_day=false) queda registrada para trazabilidad
-- pero NO se excluye del cálculo -- no existe hoy una fórmula de asistencia
-- por jornada/bloque, y el pedido es explícito: no inventarla.
-- Recuperación (kind='recuperacion'): no requiere lógica de cálculo nueva --
-- si hubo clases ese día, ya hay filas de attendance normales y ya cuentan;
-- esta fila es solo para trazabilidad/():resumen ("Días recuperados").
--
-- Permisos: alta/edición/anulación solo director/superadmin/inspectoria_general
-- (igual set que ya administra Inspectoría en 0014, más director/superadmin).
-- Lectura: alcance "escuela" visible para cualquier autenticado (es un hecho
-- de calendario institucional, no dato sensible de estudiantes); alcance
-- "cursos" visible para is_academic_management() + convivencia/inspectoria_
-- general + docente que dicte alguno de los cursos enlazados (mismo criterio
-- que attendance_select_scope en 0014, sin ampliarlo).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tablas
-- ---------------------------------------------------------------------------
create table public.class_suspensions (
  id uuid primary key default gen_random_uuid(),
  suspension_date date not null,
  kind text not null default 'suspension' check (kind in ('suspension', 'recuperacion')),
  scope text not null check (scope in ('escuela', 'cursos')),
  -- Categorías administrativas, no una clasificación legal -- solo aplica a
  -- kind='suspension' (una recuperación no tiene "motivo de suspensión").
  reason_type text check (reason_type in (
    'suspension_clases', 'interrupcion_jornada', 'jornada_sin_estudiantes', 'emergencia',
    'corte_servicios', 'clima', 'actividad_institucional', 'otro'
  )),
  full_day boolean not null default true,
  start_time time,
  end_time time,
  description text,
  observation text,
  -- Ruta en archivos-internos (bucket privado) -- nunca una URL pública fija.
  supporting_document_path text,
  -- Solo relevante para kind='recuperacion': a qué suspensión anterior
  -- recupera, cuando corresponde (opcional -- una recuperación no siempre
  -- tiene una suspensión puntual asociada).
  recovery_of_id uuid references public.class_suspensions(id) on delete set null,
  status text not null default 'activa' check (status in ('activa', 'anulada')),
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  voided_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  check (kind <> 'suspension' or reason_type is not null),
  check (kind <> 'recuperacion' or reason_type is null),
  check (full_day or (kind = 'suspension')),
  check (not full_day or (start_time is null and end_time is null))
);

create trigger trg_class_suspensions_updated_at before update on public.class_suspensions
  for each row execute function public.set_updated_at();

create index idx_class_suspensions_date on public.class_suspensions(suspension_date);
create index idx_class_suspensions_status on public.class_suspensions(status);
create index idx_class_suspensions_kind on public.class_suspensions(kind);
create index idx_class_suspensions_recovery_of on public.class_suspensions(recovery_of_id);

comment on table public.class_suspensions is
  'Días sin clases (total o parcial) y días recuperados, para excluir/incluir correctamente el denominador de los reportes de asistencia. No reemplaza ni edita filas de attendance.';
comment on column public.class_suspensions.full_day is
  'Si es true, ese día se excluye del cálculo de asistencia para los cursos afectados. Si es false (interrupción parcial), queda registrado para trazabilidad pero NO se excluye -- no existe cálculo por jornada/bloque.';

create table public.class_suspension_courses (
  suspension_id uuid not null references public.class_suspensions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (suspension_id, course_id)
);
create index idx_class_suspension_courses_course on public.class_suspension_courses(course_id);

comment on table public.class_suspension_courses is
  'Cursos afectados cuando class_suspensions.scope = ''cursos''. Sin filas cuando scope = ''escuela'' (aplica a todos).';

-- ---------------------------------------------------------------------------
-- 2) RLS
--
-- class_suspensions_select y class_suspension_courses_select se
-- referenciarían mutuamente si cada una consultara la otra tabla en línea
-- (una EXISTS contra class_suspension_courses dentro de la política de
-- class_suspensions, y viceversa) -- en vez de eso, ambas políticas de
-- lectura reutilizan una única función security definer
-- (class_suspension_visible), mismo patrón ya usado en este esquema para
-- evitar exactamente esto (teaches_course(), convivencia_case_assigned() en
-- 0026/0036): al ser security definer, sus consultas internas no vuelven a
-- pasar por RLS, así que no hay referencia circular entre políticas.
-- ---------------------------------------------------------------------------
alter table public.class_suspensions enable row level security;
alter table public.class_suspension_courses enable row level security;

create or replace function public.class_suspension_visible(p_suspension_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_suspensions cs
    where cs.id = p_suspension_id
      and (
        cs.scope = 'escuela'
        or public.is_academic_management()
        or public.has_any_role(array['convivencia', 'inspectoria_general'])
        or exists (
          select 1 from public.class_suspension_courses csc
          where csc.suspension_id = cs.id and public.teaches_course(csc.course_id)
        )
      )
  );
$$;

revoke execute on function public.class_suspension_visible(uuid) from public;
grant execute on function public.class_suspension_visible(uuid) to authenticated;

create policy "class_suspensions_select" on public.class_suspensions
  for select to authenticated
  using (public.class_suspension_visible(id));

create policy "class_suspensions_insert" on public.class_suspensions
  for insert to authenticated
  with check (
    public.has_any_role(array['director', 'superadmin', 'inspectoria_general'])
    and created_by = auth.uid()
  );

create policy "class_suspensions_update" on public.class_suspensions
  for update to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']))
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));

-- Sin política de DELETE a propósito -- anulación es lógica (status='anulada').

create policy "class_suspension_courses_select" on public.class_suspension_courses
  for select to authenticated
  using (public.class_suspension_visible(suspension_id));

create policy "class_suspension_courses_insert" on public.class_suspension_courses
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));

create policy "class_suspension_courses_delete" on public.class_suspension_courses
  for delete to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));

-- ---------------------------------------------------------------------------
-- 3) Grants -- service_role no tiene grants de tabla por diseño (ver resto
--    del esquema); todo el acceso pasa por RLS con el rol authenticated.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.class_suspensions to authenticated;
grant select, insert, delete on public.class_suspension_courses to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Storage -- documento/resolución de respaldo opcional, bucket privado
--    archivos-internos/asistencia/suspensiones/{suspension_id}/, mismo patrón
--    de storage.foldername(name) con el id en la posición 3 que ya usa 0036
--    para actas de caso. Solo lectura/alta para los mismos 3 roles que
--    administran el calendario -- no amplía a docente/convivencia aunque
--    ellos puedan ver la fila de la suspensión en la tabla.
-- ---------------------------------------------------------------------------
create policy "archivos_internos_asistencia_suspensiones_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'asistencia'
  and (storage.foldername(name))[2] = 'suspensiones'
  and public.has_any_role(array['director', 'superadmin', 'inspectoria_general'])
);

create policy "archivos_internos_asistencia_suspensiones_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'asistencia'
  and (storage.foldername(name))[2] = 'suspensiones'
  and public.has_any_role(array['director', 'superadmin', 'inspectoria_general'])
);
