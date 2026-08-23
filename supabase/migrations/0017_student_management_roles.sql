-- =============================================================================
-- Gestión rápida de estudiantes para director/utp/superadmin/inspectoria_general/
-- convivencia. Ningún camino nuevo usa UPDATE/INSERT/DELETE directo por RLS
-- sobre students para inspectoria_general/convivencia — todo pasa por RPC
-- security definer, acotado a los campos permitidos, con auditoría de
-- antes/después. administrativo NO se agrega a ninguno de estos RPC nuevos
-- (no estaba en la lista de roles pedida) — conserva su acceso existente
-- vía students_write_admin/enrollments_write_admin, sin cambios aquí.
-- students_write_admin / enrollments_write_admin (director/utp/administrativo/
-- superadmin) NO se tocan — siguen con su acceso directo de siempre.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Retiro — se agrega 'convivencia' al RPC ya existente (0014). Mismo
--    comportamiento: solo status+active en students, status en enrollments,
--    motivo a audit_logs, nunca DELETE.
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
  if not public.has_any_role(array['director','utp','administrativo','superadmin','inspectoria_general','convivencia']) then
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
-- Ya tenía revoke/grant desde 0014, no hace falta repetirlo.

-- ---------------------------------------------------------------------------
-- 2) Edición acotada de ficha — única vía para inspectoria_general y
--    convivencia (director/utp/superadmin conservan además su UPDATE directo
--    vía students_write_admin, sin cambios). Campos explícitamente permitidos:
--    first_names, last_names, run, birth_date, notes. NUNCA status (los
--    cambios de estado van exclusivamente por los RPC de matrícula/retiro/
--    reactivación, para no desincronizar students.status de enrollments).
-- ---------------------------------------------------------------------------
create or replace function public.update_student_fields(
  p_student_id uuid,
  p_first_names text,
  p_last_names text,
  p_run text,
  p_birth_date date,
  p_notes text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before record;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  select first_names, last_names, run, birth_date, notes into v_before
  from public.students where id = p_student_id;
  if not found then
    raise exception 'Estudiante no encontrado';
  end if;

  if exists (select 1 from public.students where run = p_run and id <> p_student_id) then
    raise exception 'Ya existe otro estudiante registrado con ese RUN';
  end if;

  update public.students
     set first_names = p_first_names,
         last_names = p_last_names,
         run = p_run,
         birth_date = p_birth_date,
         notes = p_notes
   where id = p_student_id;

  perform public.log_audit('update_student_fields', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'first_names', v_before.first_names, 'last_names', v_before.last_names,
        'run', v_before.run, 'birth_date', v_before.birth_date, 'notes', v_before.notes
      ),
      'after', jsonb_build_object(
        'first_names', p_first_names, 'last_names', p_last_names,
        'run', p_run, 'birth_date', p_birth_date, 'notes', p_notes
      )
    ));

  return true;
end;
$$;

revoke execute on function public.update_student_fields(uuid, text, text, text, date, text) from public;
grant execute on function public.update_student_fields(uuid, text, text, text, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Matricular / cambiar de curso.
--    enrollments tiene unique(student_id, academic_year_id): un estudiante
--    solo puede tener UNA fila por año, y su estado (activa/retirada/
--    trasladada) vive dentro de esa misma fila. Por eso esta función hace
--    UPSERT manual (select + insert/update) en vez de un INSERT ciego: si NO
--    existe fila para ese año, la crea; si YA existe (aunque esté retirada),
--    la actualiza a 'activa' con el curso nuevo. Un INSERT ciego habría
--    violado el unique en cuanto el estudiante tuviera una matrícula previa
--    retirada para el mismo año.
-- ---------------------------------------------------------------------------
create or replace function public.enroll_student(
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course_id and academic_year_id = p_academic_year_id
  ) then
    raise exception 'El curso indicado no corresponde a ese año académico';
  end if;

  select id, course_id, status into v_existing
  from public.enrollments
  where student_id = p_student_id and academic_year_id = p_academic_year_id;

  if v_existing.id is not null and v_existing.status = 'activa' and v_existing.course_id = p_course_id then
    raise exception 'El estudiante ya está matriculado en ese curso para ese año';
  end if;

  if v_existing.id is not null then
    update public.enrollments set course_id = p_course_id, status = 'activa'
    where id = v_existing.id;
  else
    insert into public.enrollments (student_id, course_id, academic_year_id, status)
    values (p_student_id, p_course_id, p_academic_year_id, 'activa');
  end if;

  update public.students set status = 'matriculado', active = true
  where id = p_student_id and status <> 'matriculado';

  perform public.log_audit('enroll_student', 'estudiantes', 'enrollments', p_student_id::text,
    jsonb_build_object(
      'course_id', p_course_id, 'academic_year_id', p_academic_year_id,
      'previous_course_id', v_existing.course_id, 'previous_status', v_existing.status
    ));

  return true;
end;
$$;

revoke execute on function public.enroll_student(uuid, uuid, uuid) from public;
grant execute on function public.enroll_student(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Crear estudiante + matrícula en una sola operación seguray. RUN
--    duplicado lo bloquea el unique(run) ya existente en students (23505).
-- ---------------------------------------------------------------------------
create or replace function public.create_student_with_enrollment(
  p_first_names text,
  p_last_names text,
  p_run text,
  p_birth_date date,
  p_course_id uuid,
  p_academic_year_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  insert into public.students (first_names, last_names, run, birth_date, status, active)
  values (p_first_names, p_last_names, p_run, p_birth_date, 'matriculado', true)
  returning id into v_student_id;

  insert into public.enrollments (student_id, course_id, academic_year_id, status)
  values (v_student_id, p_course_id, p_academic_year_id, 'activa');

  perform public.log_audit('create_student_with_enrollment', 'estudiantes', 'students', v_student_id::text,
    jsonb_build_object(
      'first_names', p_first_names, 'last_names', p_last_names, 'run', p_run,
      'course_id', p_course_id, 'academic_year_id', p_academic_year_id
    ));

  return v_student_id;
end;
$$;

revoke execute on function public.create_student_with_enrollment(text, text, text, date, uuid, uuid) from public;
grant execute on function public.create_student_with_enrollment(text, text, text, date, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Reactivar / reincorporar — semánticamente distinto de enroll_student
--    (exige que el estudiante esté hoy 'retirado', para no usarse como
--    atajo de matrícula normal) aunque la operación de fondo sobre
--    enrollments sea el mismo UPSERT por la razón explicada en (3): la fila
--    del año ya existe (quedó 'retirada' al retirar al estudiante), así que
--    también hay que actualizarla, nunca insertarla de nuevo.
-- ---------------------------------------------------------------------------
create or replace function public.reactivate_student(
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id and status = 'retirado') then
    raise exception 'El estudiante no está retirado — usa "Matricular" si es un ingreso o cambio de curso';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course_id and academic_year_id = p_academic_year_id
  ) then
    raise exception 'El curso indicado no corresponde a ese año académico';
  end if;

  select id, course_id, status into v_existing
  from public.enrollments
  where student_id = p_student_id and academic_year_id = p_academic_year_id;

  if v_existing.id is not null then
    update public.enrollments set course_id = p_course_id, status = 'activa'
    where id = v_existing.id;
  else
    insert into public.enrollments (student_id, course_id, academic_year_id, status)
    values (p_student_id, p_course_id, p_academic_year_id, 'activa');
  end if;

  update public.students set status = 'matriculado', active = true where id = p_student_id;

  perform public.log_audit('reactivate_student', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('course_id', p_course_id, 'academic_year_id', p_academic_year_id));

  return true;
end;
$$;

revoke execute on function public.reactivate_student(uuid, uuid, uuid) from public;
grant execute on function public.reactivate_student(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Eliminación física controlada — SOLO si cero dependencias en las 6
--    tablas que referencian students (enrollments, grades, attendance,
--    student_support, pie_records, certificates). Si alguna existe, aborta
--    con mensaje explicativo en vez de eliminar. Motivo obligatorio.
--    NUNCA se otorga DELETE por RLS sobre students — esta función, con
--    SECURITY DEFINER, es la única vía posible.
-- ---------------------------------------------------------------------------
create or replace function public.delete_student_if_unused(
  p_student_id uuid,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Debes indicar un motivo para eliminar el registro';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;

  if exists (select 1 from public.enrollments where student_id = p_student_id)
     or exists (select 1 from public.grades where student_id = p_student_id)
     or exists (select 1 from public.attendance where student_id = p_student_id)
     or exists (select 1 from public.student_support where student_id = p_student_id)
     or exists (select 1 from public.pie_records where student_id = p_student_id)
     or exists (select 1 from public.certificates where student_id = p_student_id) then
    raise exception 'No se puede eliminar: el estudiante tiene matrícula, notas, asistencia, seguimiento, PIE o certificados asociados. Usa "Retirar" en su lugar.';
  end if;

  perform public.log_audit('delete_student_if_unused', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('reason', p_reason));

  delete from public.students where id = p_student_id;

  return true;
end;
$$;

revoke execute on function public.delete_student_if_unused(uuid, text) from public;
grant execute on function public.delete_student_if_unused(uuid, text) to authenticated;
