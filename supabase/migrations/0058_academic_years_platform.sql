-- =============================================================================
-- Plataforma por año académico (2026 a 2050) y traspaso de año
-- =============================================================================
-- 1) Años 2026-2050 ya creados (con su Primer y Segundo Semestre), para poder
--    elegirlos desde el selector de año de la plataforma sin crearlos a mano.
-- 2) "Año vigente" = un solo año con active = true (el que se abre por defecto).
--    Hasta hoy cualquier año nuevo nacía active = true, lo que dejaba varios
--    "vigentes" a la vez; ahora nace inactivo y solo uno puede estar vigente.
-- 3) set_current_academic_year(): cambia el año vigente de forma atómica.
-- 4) rollover_academic_year(): traspaso de año -- crea los cursos del año
--    destino, copia (opcional) jefaturas y carga docente, y matricula a los
--    estudiantes en el curso que les corresponde. Es idempotente: se puede
--    volver a ejecutar sin duplicar nada (lo ya traspasado se omite).
--
-- Ejecutar después de 0001-0057 (usa has_any_role, log_audit, next_certificate_folio).
-- No borra ni modifica datos de ningún año existente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Un solo año vigente
-- ---------------------------------------------------------------------------
-- Si hoy hubiera varios años marcados como vigentes, se conserva solo el más reciente.
update public.academic_years
set active = false
where active
  and year <> (select max(year) from public.academic_years where active);

alter table public.academic_years alter column active set default false;

create unique index if not exists academic_years_single_active
  on public.academic_years ((true)) where active;

-- ---------------------------------------------------------------------------
-- 2) Años 2026 a 2050 con sus dos semestres (los que ya existan no se tocan)
-- ---------------------------------------------------------------------------
insert into public.academic_years (year, active)
select y, false
from generate_series(2026, 2050) as y
on conflict (year) do nothing;

insert into public.academic_periods (academic_year_id, name, order_index)
select ay.id, p.name, p.order_index
from public.academic_years ay
cross join (values ('Primer Semestre', 1), ('Segundo Semestre', 2)) as p(name, order_index)
where ay.year between 2026 and 2050
on conflict (academic_year_id, order_index) do nothing;

-- Si por algún motivo no quedó ningún año vigente, queda el más antiguo de los creados.
update public.academic_years
set active = true
where year = (select min(year) from public.academic_years)
  and not exists (select 1 from public.academic_years where active);

-- ---------------------------------------------------------------------------
-- 3) Cambiar el año vigente
-- ---------------------------------------------------------------------------
create or replace function public.set_current_academic_year(p_year_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int;
begin
  if not public.has_any_role(array['director','superadmin']) then
    raise exception 'No autorizado';
  end if;

  select year into v_year from public.academic_years where id = p_year_id;
  if v_year is null then
    raise exception 'Año académico no encontrado';
  end if;

  update public.academic_years set active = false where active and id <> p_year_id;
  update public.academic_years set active = true where id = p_year_id;

  perform public.log_audit('cambiar_anio_vigente', 'administracion', 'academic_years', p_year_id::text,
    jsonb_build_object('year', v_year));
  return true;
end;
$$;

revoke execute on function public.set_current_academic_year(uuid) from public;
grant execute on function public.set_current_academic_year(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Traspaso de año
-- ---------------------------------------------------------------------------
-- La aplicación calcula el plan (a qué curso va cada estudiante) y esta
-- función solo lo ejecuta, todo en una transacción:
--   p_courses      [{level, letter}]            cursos que deben existir en el año destino.
--                                               Si el mismo curso (nivel + letra) existe en el
--                                               año origen, se copian su descripción, foto,
--                                               visibilidad pública y -si p_copy_homeroom-
--                                               su profesor(a) jefe.
--   p_enrollments  [{student_id, level, letter}] matrículas a crear en el año destino.
--   p_graduates    uuid[]                       estudiantes que egresan (status = 'egresado').
--   p_copy_assignments                          copia la carga docente (asignatura + docente)
--                                               de cada curso al curso del mismo nivel y letra.
-- Lo que ya exista en el año destino (cursos, matrículas, asignaciones) se omite.
create or replace function public.rollover_academic_year(
  p_from_year uuid,
  p_to_year uuid,
  p_courses jsonb,
  p_enrollments jsonb,
  p_graduates uuid[] default '{}',
  p_copy_homeroom boolean default true,
  p_copy_assignments boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_num int;
  v_to_num int;
  c record;
  r record;
  v_course_id uuid;
  v_folio text;
  v_tmp int;
  n_courses int := 0;
  n_assignments int := 0;
  n_enrolled int := 0;
  n_skipped int := 0;
  n_graduated int := 0;
begin
  if not public.has_any_role(array['director','utp','superadmin']) then
    raise exception 'No autorizado';
  end if;
  if p_from_year = p_to_year then
    raise exception 'El año de origen y el de destino deben ser distintos';
  end if;

  select year into v_from_num from public.academic_years where id = p_from_year;
  select year into v_to_num from public.academic_years where id = p_to_year;
  if v_from_num is null or v_to_num is null then
    raise exception 'Año académico no encontrado';
  end if;

  -- Cursos del año destino
  for c in
    select x->>'level' as level, coalesce(x->>'letter', '') as letter
    from jsonb_array_elements(coalesce(p_courses, '[]'::jsonb)) x
  loop
    insert into public.courses (academic_year_id, level, letter, homeroom_teacher_id, description, photo_url, public_visible, active)
    select p_to_year, c.level, c.letter,
           case when p_copy_homeroom then s.homeroom_teacher_id end,
           s.description, s.photo_url, coalesce(s.public_visible, true), true
    from (select 1) d
    left join public.courses s
      on s.academic_year_id = p_from_year and s.level = c.level and s.letter = c.letter
    on conflict (academic_year_id, level, letter) do nothing;
    get diagnostics v_tmp = row_count;
    n_courses := n_courses + v_tmp;
  end loop;

  -- Carga docente
  if p_copy_assignments then
    insert into public.teacher_assignments (academic_year_id, course_id, subject_id, teacher_id, active)
    select p_to_year, dc.id, ta.subject_id, ta.teacher_id, true
    from public.teacher_assignments ta
    join public.courses sc on sc.id = ta.course_id and sc.academic_year_id = p_from_year
    join public.courses dc on dc.academic_year_id = p_to_year and dc.level = sc.level and dc.letter = sc.letter
    where ta.active
    on conflict (course_id, subject_id, teacher_id) do nothing;
    get diagnostics n_assignments = row_count;
  end if;

  -- Matrículas
  for r in
    select (x->>'student_id')::uuid as student_id, x->>'level' as level, coalesce(x->>'letter', '') as letter
    from jsonb_array_elements(coalesce(p_enrollments, '[]'::jsonb)) x
  loop
    select id into v_course_id
    from public.courses
    where academic_year_id = p_to_year and level = r.level and letter = r.letter;
    if v_course_id is null then
      raise exception 'Falta el curso % % en el año destino', r.level, r.letter;
    end if;

    if exists (select 1 from public.enrollments where student_id = r.student_id and academic_year_id = p_to_year) then
      n_skipped := n_skipped + 1;
      continue;
    end if;

    v_folio := public.next_certificate_folio('matricula', v_to_num);
    insert into public.enrollments (student_id, course_id, academic_year_id, status, enrollment_number, admission_condition)
    values (r.student_id, v_course_id, p_to_year, 'activa', v_folio, 'Continuidad (traspaso de año)');
    n_enrolled := n_enrolled + 1;
  end loop;

  -- Egresados
  if coalesce(array_length(p_graduates, 1), 0) > 0 then
    update public.students set status = 'egresado'
    where id = any(p_graduates) and status = 'matriculado';
    get diagnostics n_graduated = row_count;
  end if;

  perform public.log_audit('traspaso_anio', 'administracion', 'academic_years', p_to_year::text,
    jsonb_build_object(
      'from_year', v_from_num, 'to_year', v_to_num,
      'courses_created', n_courses, 'assignments_copied', n_assignments,
      'enrolled', n_enrolled, 'skipped', n_skipped, 'graduated', n_graduated
    ));

  return jsonb_build_object(
    'from_year', v_from_num, 'to_year', v_to_num,
    'courses_created', n_courses, 'assignments_copied', n_assignments,
    'enrolled', n_enrolled, 'skipped', n_skipped, 'graduated', n_graduated
  );
end;
$$;

revoke execute on function public.rollover_academic_year(uuid, uuid, jsonb, jsonb, uuid[], boolean, boolean) from public;
grant execute on function public.rollover_academic_year(uuid, uuid, jsonb, jsonb, uuid[], boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) El sitio público muestra solo los cursos del año vigente
-- ---------------------------------------------------------------------------
-- Con varios años en la base, la página pública de Cursos mostraría el mismo
-- curso repetido (uno por año). Para filtrar por "año vigente" sin datos
-- sensibles de por medio, se permite a la lectura anónima ver la tabla de años
-- (solo contiene el número del año y si es el vigente).
create policy "academic_years_select_anon" on public.academic_years
  for select to anon using (true);
grant select on public.academic_years to anon;
