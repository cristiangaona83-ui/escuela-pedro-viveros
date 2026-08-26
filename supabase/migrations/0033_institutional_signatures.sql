-- =============================================================================
-- Firmas institucionales — Escuela Profesor Pedro Viveros Ormeño
--
-- Reemplaza la ruta hardcodeada `firmas/firma-director.png` (construida en
-- sesión previa, ver src/lib/pdf/director-signature.ts) por un registro
-- administrable: qué archivo está activo, quién lo subió y cuándo. El
-- binario sigue viviendo exclusivamente en el bucket privado
-- `archivos-internos` -- nunca en archivos-publicos ni en /public.
--
-- Historial de cambios: se reutiliza log_audit() (0002_rls.sql), ya usada
-- por certificados -- no se crea una tabla de historial nueva.
--
-- Baja lógica, no DELETE: sigue el mismo principio que el resto del esquema
-- (ver comentario de cabecera en 0004_grants.sql) -- una firma reemplazada
-- se desactiva (active = false) y queda como historial, nunca se borra la
-- fila. Por eso esta migración no otorga DELETE sobre la tabla.
--
-- Ejecutar después de 0001-0005 (usa has_role/has_any_role, set_updated_at,
-- profiles, staff_members y las políticas de storage.objects ya definidas).
-- =============================================================================

create table public.institutional_signatures (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('director', 'teacher', 'other')),
  staff_member_id uuid references public.staff_members(id) on delete set null,
  display_name text not null,
  title text not null,
  bucket text not null default 'archivos-internos',
  storage_path text not null,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint institutional_signatures_teacher_requires_staff
    check (kind <> 'teacher' or staff_member_id is not null)
);

create trigger trg_institutional_signatures_updated_at
  before update on public.institutional_signatures
  for each row execute function public.set_updated_at();

-- A lo sumo una firma activa de Director, y a lo sumo una firma activa por
-- docente. 'other' queda sin restricción de unicidad (categoría abierta a
-- futuro, sin caso de uso concreto todavía).
create unique index institutional_signatures_active_director_unique
  on public.institutional_signatures (kind)
  where active and kind = 'director';

create unique index institutional_signatures_active_teacher_unique
  on public.institutional_signatures (kind, staff_member_id)
  where active and kind = 'teacher';

alter table public.institutional_signatures enable row level security;

-- Lectura: los mismos roles que hoy pueden emitir certificados/informes
-- (src/app/plataforma/api/certificados/**, informes/**) -- necesitan poder
-- resolver cuál es la firma activa para generar el PDF con el cliente de
-- sesión, sin depender de service_role.
create policy "institutional_signatures_select_scope" on public.institutional_signatures
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','superadmin']));

-- Escritura: reemplazar una firma es una operación sensible -- solo
-- Director/Superadmin, más restrictivo que la emisión de certificados.
create policy "institutional_signatures_write_admin" on public.institutional_signatures
  for all to authenticated
  using (public.has_any_role(array['director','superadmin']))
  with check (public.has_any_role(array['director','superadmin']));

grant select, insert, update on public.institutional_signatures to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: carpeta "firmas" dentro de archivos-internos (mismo patrón que la
-- carpeta "documentos" de 0005_storage_policies.sql, con escritura más
-- restringida). Sin política para anon: las firmas nunca son públicas.
-- ---------------------------------------------------------------------------
create policy "archivos_internos_firmas_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'firmas'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

create policy "archivos_internos_firmas_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'firmas'
  and public.has_any_role(array['director', 'superadmin'])
);

create policy "archivos_internos_firmas_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'firmas'
  and public.has_any_role(array['director', 'superadmin'])
)
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'firmas'
  and public.has_any_role(array['director', 'superadmin'])
);

create policy "archivos_internos_firmas_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'firmas'
  and public.has_any_role(array['director', 'superadmin'])
);

-- ---------------------------------------------------------------------------
-- Semilla: registra la firma del Director ya subida y verificada
-- (archivos-internos/firmas/firma-director.png) para no perder continuidad
-- -- los certificados siguen mostrando la misma firma sin que el Director
-- tenga que volver a subirla.
-- ---------------------------------------------------------------------------
insert into public.institutional_signatures (kind, display_name, title, storage_path, active)
values ('director', 'Cristian Fernando Gaona Villena', 'Director', 'firmas/firma-director.png', true);
