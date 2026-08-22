-- =============================================================================
-- Datos DEMO — NO son estudiantes reales. Todo registro está marcado
-- con el prefijo "DEMO" para poder identificarlo y eliminarlo fácilmente.
-- Ejecutar solo en un proyecto de pruebas, nunca en producción.
--
-- Limpieza: eliminar en orden inverso, o simplemente:
--   delete from public.students where notes = 'DEMO';
--   delete from public.academic_years where year = 2026 and
--     not exists (select 1 from public.courses where academic_year_id = academic_years.id);
-- =============================================================================

insert into public.academic_years (year, active) values (2026, true)
  on conflict (year) do nothing;

with ay as (select id from public.academic_years where year = 2026)
insert into public.courses (academic_year_id, level, letter, description, public_visible, active)
select ay.id, '5° Básico', 'A', 'Curso de demostración (DEMO).', true, true from ay
on conflict do nothing;

with ay as (select id from public.academic_years where year = 2026)
insert into public.academic_periods (academic_year_id, name, order_index, status)
select ay.id, 'Primer Semestre', 1, 'abierto' from ay
union all
select ay.id, 'Segundo Semestre', 2, 'abierto' from ay
on conflict do nothing;

insert into public.students (first_names, last_names, run, birth_date, status, notes)
values
  ('Estudiante Uno', 'Apellido DEMO', '11111111-1', '2015-03-10', 'matriculado', 'DEMO'),
  ('Estudiante Dos', 'Apellido DEMO', '22222222-2', '2015-06-22', 'matriculado', 'DEMO')
on conflict (run) do nothing;

with ay as (select id from public.academic_years where year = 2026),
     c as (select id from public.courses where level = '5° Básico' and letter = 'A' limit 1)
insert into public.enrollments (student_id, course_id, academic_year_id)
select s.id, c.id, ay.id
from public.students s, c, ay
where s.notes = 'DEMO'
on conflict do nothing;
