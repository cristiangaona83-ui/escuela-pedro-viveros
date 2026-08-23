-- =============================================================================
-- Gestión de apoderados y contactos.
--
-- Hallazgo de auditoría: el esquema actual solo soporta UN apoderado por
-- estudiante (students.guardian_id, puntero único) — no hay forma de
-- representar "apoderado principal" + "contacto de emergencia" como dos
-- personas distintas, ni que un estudiante tenga más de un apoderado
-- vinculado. Se agrega una tabla de relación students_guardians
-- (muchos-a-muchos) para soportar eso; students.guardian_id se conserva
-- SIN ELIMINAR (por compatibilidad con getStudent()/guardian_contact_info
-- existentes) y queda sincronizado automáticamente con quien sea el
-- apoderado principal en la nueva tabla, vía el RPC set_primary_guardian.
--
-- El esquema NO contempla "dirección" (guardians no tiene esa columna) —
-- no se agrega aquí; si se quiere, es una decisión aparte a confirmar.
--
-- Accesos:
--   - director/utp/administrativo/convivencia/superadmin: acceso completo
--     de lectura y escritura directa (RLS), igual que ya tenían para
--     guardians (administrativo no estaba en la lista pedida esta vez, así
--     que NO se le agrega nada nuevo — conserva exactamente lo que ya
--     tenía). convivencia se agrega a guardians_write_admin (antes solo
--     tenía lectura) porque se pidió explícitamente que pueda administrar.
--   - inspectoria_general: exactamente como ya estaba definido — nunca ve
--     ni puede fijar `run`, solo puede escribir a través de RPC acotados
--     (nunca INSERT/UPDATE/DELETE directo sobre guardians/student_guardians).
--   - docentes y profesionales PIE: sin cambios — no obtienen ninguna vía
--     de escritura nueva.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla de relación estudiante-apoderado (muchos a muchos)
-- ---------------------------------------------------------------------------
create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  relationship text,
  is_primary boolean not null default false,
  is_emergency_contact boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, guardian_id)
);
create index idx_student_guardians_student on public.student_guardians (student_id);
create index idx_student_guardians_guardian on public.student_guardians (guardian_id);
-- A lo sumo un apoderado "principal" por estudiante, garantizado por el
-- propio esquema (no solo por convención de la app).
create unique index student_guardians_one_primary on public.student_guardians (student_id) where is_primary;

-- Backfill: la relación students.guardian_id existente se refleja como el
-- primer "principal" de cada estudiante que ya tenía uno. No se pierde ni
-- se duplica ningún dato — es exactamente lo que ya existía, representado
-- en la tabla nueva.
insert into public.student_guardians (student_id, guardian_id, is_primary)
select id, guardian_id, true from public.students where guardian_id is not null
on conflict (student_id, guardian_id) do nothing;

alter table public.student_guardians enable row level security;

create policy "student_guardians_select_scope" on public.student_guardians
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','pie','convivencia','superadmin','inspectoria_general']));

create policy "student_guardians_write_admin" on public.student_guardians
  for all to authenticated
  using (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']));
-- inspectoria_general NO tiene política de escritura directa aquí — solo
-- puede modificar esta tabla a través de los RPC de la sección 4.

grant select, insert, update, delete on public.student_guardians to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Evita apoderados duplicados por RUN — respaldo real a nivel de base,
--    no solo disciplina de la aplicación ("no dupliques personas").
-- ---------------------------------------------------------------------------
create unique index guardians_run_unique on public.guardians (run) where run is not null;
-- Si esto falla al ejecutar, significa que YA existen dos o más apoderados
-- con el mismo RUN en la base actual — hay que resolver esos duplicados
-- manualmente antes de poder aplicar esta restricción (avisar antes de
-- reintentar, no forzar).

-- ---------------------------------------------------------------------------
-- 3) convivencia se agrega a guardians_write_admin (antes solo lectura).
--    director/utp/administrativo/superadmin no cambian.
-- ---------------------------------------------------------------------------
alter policy "guardians_write_admin" on public.guardians
  using (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']));

-- inspectoria_general debe seguir viendo (vía guardian_contact_info, sin
-- RUN) a cualquier apoderado vinculado por la tabla nueva, no solo por el
-- puntero antiguo students.guardian_id.
alter policy "guardians_select_inspectoria" on public.guardians
  using (
    public.has_role('inspectoria_general')
    and (
      exists (select 1 from public.students s where s.guardian_id = guardians.id)
      or exists (select 1 from public.student_guardians sg where sg.guardian_id = guardians.id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4) RPC compartido — cambiar apoderado principal (las 5 roles nuevas).
--    Mantiene students.guardian_id sincronizado (compatibilidad con
--    getStudent()/guardian_contact_info) y garantiza un solo principal.
-- ---------------------------------------------------------------------------
create or replace function public.set_primary_guardian(
  p_student_id uuid,
  p_guardian_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role(array['director','utp','convivencia','superadmin','inspectoria_general']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;
  if not exists (select 1 from public.guardians where id = p_guardian_id) then
    raise exception 'Apoderado no encontrado';
  end if;

  -- Desmarca cualquier principal anterior ANTES de insertar el nuevo, para
  -- nunca tener dos filas is_primary=true a la vez (violaría el índice
  -- único parcial de arriba).
  update public.student_guardians
     set is_primary = false
   where student_id = p_student_id and is_primary;

  insert into public.student_guardians (student_id, guardian_id, is_primary)
  values (p_student_id, p_guardian_id, true)
  on conflict (student_id, guardian_id) do update set is_primary = true;

  update public.students set guardian_id = p_guardian_id where id = p_student_id;

  perform public.log_audit('set_primary_guardian', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('guardian_id', p_guardian_id));

  return true;
end;
$$;
revoke execute on function public.set_primary_guardian(uuid, uuid) from public;
grant execute on function public.set_primary_guardian(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPC exclusivos de inspectoria_general — nunca reciben ni devuelven RUN.
-- ---------------------------------------------------------------------------

-- Buscar apoderados existentes por nombre, para evitar crear duplicados
-- cuando ella no puede verificar por RUN.
create or replace function public.search_guardians_by_name(p_query text)
returns table(id uuid, full_name text, phone text, email text, relationship text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  return query
    select g.id, g.full_name, g.phone, g.email, g.relationship
    from public.guardians g
    where g.full_name ilike '%' || p_query || '%'
    order by g.full_name
    limit 20;
end;
$$;
revoke execute on function public.search_guardians_by_name(text) from public;
grant execute on function public.search_guardians_by_name(text) to authenticated;

-- Crear un apoderado nuevo (run siempre null — ella no puede fijarlo).
create or replace function public.create_guardian_contact(
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_relationship text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'El nombre del apoderado es obligatorio';
  end if;

  insert into public.guardians (full_name, phone, email, relationship)
  values (trim(p_full_name), p_phone, p_email, p_relationship)
  returning id into v_id;

  perform public.log_audit('create_guardian_contact', 'apoderados', 'guardians', v_id::text,
    jsonb_build_object('full_name', p_full_name));

  return v_id;
end;
$$;
revoke execute on function public.create_guardian_contact(text, text, text, text) from public;
grant execute on function public.create_guardian_contact(text, text, text, text) to authenticated;

-- Editar datos de un apoderado existente (nunca toca run).
create or replace function public.update_guardian_contact(
  p_guardian_id uuid,
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_relationship text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.guardians where id = p_guardian_id) then
    raise exception 'Apoderado no encontrado';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'El nombre del apoderado es obligatorio';
  end if;

  update public.guardians
     set full_name = trim(p_full_name), phone = p_phone, email = p_email, relationship = p_relationship
   where id = p_guardian_id;

  perform public.log_audit('update_guardian_contact', 'apoderados', 'guardians', p_guardian_id::text,
    jsonb_build_object('full_name', p_full_name));

  return true;
end;
$$;
revoke execute on function public.update_guardian_contact(uuid, text, text, text, text) from public;
grant execute on function public.update_guardian_contact(uuid, text, text, text, text) to authenticated;

-- Vincular (o actualizar el vínculo de) un apoderado existente a un
-- estudiante — nunca crea el apoderado, nunca toca run.
create or replace function public.link_guardian_to_student(
  p_student_id uuid,
  p_guardian_id uuid,
  p_relationship text default null,
  p_is_primary boolean default false,
  p_is_emergency_contact boolean default false
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;
  if not exists (select 1 from public.guardians where id = p_guardian_id) then
    raise exception 'Apoderado no encontrado';
  end if;

  insert into public.student_guardians (student_id, guardian_id, relationship, is_emergency_contact)
  values (p_student_id, p_guardian_id, p_relationship, p_is_emergency_contact)
  on conflict (student_id, guardian_id) do update
    set relationship = excluded.relationship, is_emergency_contact = excluded.is_emergency_contact;

  if p_is_primary then
    perform public.set_primary_guardian(p_student_id, p_guardian_id);
  end if;

  perform public.log_audit('link_guardian_to_student', 'estudiantes', 'student_guardians', p_student_id::text,
    jsonb_build_object('guardian_id', p_guardian_id, 'relationship', p_relationship,
      'is_primary', p_is_primary, 'is_emergency_contact', p_is_emergency_contact));

  return true;
end;
$$;
revoke execute on function public.link_guardian_to_student(uuid, uuid, text, boolean, boolean) from public;
grant execute on function public.link_guardian_to_student(uuid, uuid, text, boolean, boolean) to authenticated;

-- Desvincular (nunca DELETE físico del apoderado en sí — solo quita el
-- vínculo con ESTE estudiante; el registro del apoderado y su historial
-- con otros estudiantes, si los tiene, permanecen intactos).
create or replace function public.unlink_guardian_from_student(
  p_student_id uuid,
  p_guardian_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;

  delete from public.student_guardians
   where student_id = p_student_id and guardian_id = p_guardian_id and is_primary = false;
  -- Nota: no permite desvincular al principal directamente (evita dejar al
  -- estudiante sin apoderado principal por accidente) — hay que asignar
  -- otro principal primero con set_primary_guardian.

  if not found then
    raise exception 'No se puede desvincular: no está vinculado, o es el apoderado principal (cambia el principal primero)';
  end if;

  update public.students set guardian_id = null
   where id = p_student_id and guardian_id = p_guardian_id
     and not exists (select 1 from public.student_guardians sg where sg.student_id = p_student_id and sg.is_primary);

  perform public.log_audit('unlink_guardian_from_student', 'estudiantes', 'student_guardians', p_student_id::text,
    jsonb_build_object('guardian_id', p_guardian_id));

  return true;
end;
$$;
revoke execute on function public.unlink_guardian_from_student(uuid, uuid) from public;
grant execute on function public.unlink_guardian_from_student(uuid, uuid) to authenticated;
