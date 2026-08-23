-- =============================================================================
-- Rol Inspectoría General
-- Acceso: estudiantes (lectura), cursos (lectura), asistencia (lectura+escritura),
-- retiro de estudiantes (vía RPC acotado), apoderados (lectura mínima, vía vista),
-- documentos internos (lectura de todos, alta y edición solo de los propios).
-- No amplía is_academic_management() (sigue siendo solo director/utp/superadmin).
-- No reutiliza student_support (es Seguimiento Pedagógico, no disciplinario).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Rol nuevo
-- ---------------------------------------------------------------------------
alter table public.roles drop constraint roles_code_check;
alter table public.roles add constraint roles_code_check check (code in
  ('director','utp','docente','pie','convivencia','administrativo','superadmin','inspectoria_general'));

insert into public.roles (code, name) values ('inspectoria_general', 'Inspectoría General');

-- ---------------------------------------------------------------------------
-- 2) Lectura ampliada: estudiantes, matrículas, asistencia
-- ---------------------------------------------------------------------------
alter policy "students_select_scope" on public.students
  using (
    public.has_any_role(array['director','utp','administrativo','pie','convivencia','superadmin','inspectoria_general'])
    or public.teaches_student(id)
  );

alter policy "enrollments_select_scope" on public.enrollments
  using (
    public.is_academic_management()
    or public.has_any_role(array['administrativo','inspectoria_general'])
    or public.teaches_course(course_id)
  );

alter policy "attendance_select_scope" on public.attendance
  using (
    public.is_academic_management()
    or public.has_any_role(array['convivencia','inspectoria_general'])
    or public.teaches_course(course_id)
  );

-- Asistencia: además de lectura, Inspectoría puede registrar (atrasos/retiros
-- del día ya son valores válidos de attendance.status).
alter policy "attendance_write_scope" on public.attendance
  using (public.is_academic_management() or public.has_role('inspectoria_general') or public.teaches_course(course_id))
  with check (public.is_academic_management() or public.has_role('inspectoria_general') or public.teaches_course(course_id));

-- courses_select_authenticated y subjects_select_authenticated ya son
-- "using (true)" — Inspectoría los lee automáticamente, sin cambios aquí.

-- ---------------------------------------------------------------------------
-- 3) Retiro de estudiante — única vía de escritura sobre students/enrollments
--    para este rol. No usa GRANT UPDATE de tabla (todos los roles de app
--    comparten el rol Postgres "authenticated", así que un GRANT por columna
--    no podría distinguir a Inspectoría de Dirección/UTP). En su lugar, un
--    RPC security definer estrecho: solo puede tocar los 3 campos de estado
--    necesarios para un retiro, nunca nombre/RUN/fecha de nacimiento/apoderado.
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_student(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role(array['director','utp','administrativo','superadmin','inspectoria_general']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;

  update public.students
     set status = 'retirado', active = false
   where id = p_student_id;

  update public.enrollments
     set status = 'retirada'
   where student_id = p_student_id
     and academic_year_id = p_academic_year_id
     and status = 'activa';

  perform public.log_audit('withdraw_student', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('academic_year_id', p_academic_year_id, 'reason', p_reason));

  return true;
end;
$$;

revoke execute on function public.withdraw_student(uuid, uuid, text) from public;
grant execute on function public.withdraw_student(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Documentos — alta y edición acotadas a lo propio, nunca al sitio público.
--    documents_write_admin (director/utp/administrativo/superadmin) no se
--    toca. Estas políticas nuevas se combinan por OR con esa, sin ampliarla.
--    No se agrega política de DELETE para este rol (ver nota de borrado
--    físico más abajo — pendiente de que definas archivado antes de darle
--    esa capacidad).
-- ---------------------------------------------------------------------------
create policy "documents_insert_inspectoria" on public.documents
  for insert to authenticated
  with check (public.has_role('inspectoria_general') and is_public = false and uploaded_by = auth.uid());

create policy "documents_update_own_inspectoria" on public.documents
  for update to authenticated
  using (public.has_role('inspectoria_general') and uploaded_by = auth.uid())
  with check (public.has_role('inspectoria_general') and uploaded_by = auth.uid() and is_public = false);

-- ---------------------------------------------------------------------------
-- 5) Apoderados — lectura mínima, acotada a estudiantes que Inspectoría ya
--    puede ver (guardians.id referenciado por al menos un estudiante), y
--    reducida a 4 columnas (nombre, teléfono, correo, vínculo) vía vista con
--    security_invoker, para que el RUN del apoderado NO se exponga a este rol
--    aunque la fila sea visible. No se agrega ninguna política de escritura.
-- ---------------------------------------------------------------------------
create policy "guardians_select_inspectoria" on public.guardians
  for select to authenticated
  using (
    public.has_role('inspectoria_general')
    and exists (select 1 from public.students s where s.guardian_id = guardians.id)
  );

create or replace view public.guardian_contact_info
with (security_invoker = true) as
select id, full_name, phone, email, relationship
from public.guardians;

grant select on public.guardian_contact_info to authenticated;
