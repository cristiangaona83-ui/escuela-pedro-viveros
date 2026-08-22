-- =============================================================================
-- Datos DEMO — NO son estudiantes reales. Todo registro está marcado
-- con el prefijo "DEMO" para poder identificarlo y eliminarlo fácilmente.
-- Ejecutar solo en un proyecto de pruebas, nunca en producción.
-- Idempotente: correrlo más de una vez no crea duplicados.
--
-- Requisito previo: el usuario bootstrap (el primer administrador) ya debe
-- tener asignados AMBOS roles 'director' y 'superadmin' (ver procedimiento
-- de bootstrap ya documentado). Este archivo NUNCA hardcodea un UUID de
-- usuario: el docente de las evaluaciones/asignaciones DEMO se resuelve en
-- cada sentencia con la subconsulta `bootstrap_admin` de más abajo, que
-- identifica dinámicamente a quien tenga ambos roles a la vez. Si todavía
-- no le asignaste esos roles, las sentencias que dependen de `bootstrap_admin`
-- simplemente no insertan nada (no fallan) hasta que lo hagas.
--
-- Limpieza: eliminar en orden inverso, o simplemente:
--   delete from public.grades where entered_by is null or entered_by = updated_by; -- ver nota abajo
--   delete from public.evaluations where name in ('Evaluación DEMO 1','Evaluación DEMO 2');
--   delete from public.teacher_assignments ta using public.subjects s where ta.subject_id = s.id and s.code = 'DEMO';
--   delete from public.enrollments en using public.students s where en.student_id = s.id and s.notes = 'DEMO';
--   delete from public.students where notes = 'DEMO';
--   delete from public.subjects where code = 'DEMO';
--   delete from public.courses where description = 'Curso de demostración (DEMO).';
--   delete from public.academic_years where year = 2026 and
--     not exists (select 1 from public.courses where academic_year_id = academic_years.id);
-- =============================================================================

insert into public.academic_years (year, active) values (2026, true)
  on conflict (year) do nothing;

-- El curso DEMO se fuerza a public_visible = false en cada ejecución: a
-- diferencia del resto de este archivo, esto es un control de privacidad
-- (que nunca aparezca en el sitio público), no solo un dato de prueba, así
-- que conviene reafirmarlo aunque la fila ya exista.
with ay as (select id from public.academic_years where year = 2026)
insert into public.courses (academic_year_id, level, letter, description, public_visible, active)
select ay.id, '5° Básico', 'A', 'Curso de demostración (DEMO).', false, true from ay
on conflict (academic_year_id, level, letter)
do update set public_visible = false, description = excluded.description;

insert into public.subjects (code, name, active) values ('DEMO', 'Asignatura DEMO', true)
  on conflict (code) do nothing;

with ay as (select id from public.academic_years where year = 2026)
insert into public.academic_periods (academic_year_id, name, order_index, status)
select ay.id, 'Primer Semestre', 1, 'abierto' from ay
union all
select ay.id, 'Segundo Semestre', 2, 'abierto' from ay
on conflict do nothing;

-- RUN deliberadamente NO válidos: el esquema solo exige "text not null
-- unique" (sin CHECK de formato ni dígito verificador) y el formulario del
-- frontend tampoco valida el patrón, así que usamos un identificador que
-- jamás podría leerse como un RUN real en vez de forzar un número con
-- dígito verificador válido.
insert into public.students (first_names, last_names, run, birth_date, status, notes)
values
  ('Estudiante Uno', 'Apellido DEMO', 'DEMO-001', '2015-03-10', 'matriculado', 'DEMO'),
  ('Estudiante Dos', 'Apellido DEMO', 'DEMO-002', '2015-06-22', 'matriculado', 'DEMO')
on conflict (run) do nothing;

with ay as (select id from public.academic_years where year = 2026),
     c as (select id from public.courses where level = '5° Básico' and letter = 'A' limit 1)
insert into public.enrollments (student_id, course_id, academic_year_id)
select s.id, c.id, ay.id
from public.students s, c, ay
where s.notes = 'DEMO'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Docente DEMO: se resuelve dinámicamente, nunca se hardcodea un UUID.
-- Es el único usuario con AMBOS roles 'director' y 'superadmin' a la vez
-- (el administrador bootstrap). Se reutiliza esta misma subconsulta en las
-- dos secciones siguientes (teacher_assignments y evaluations).
-- ---------------------------------------------------------------------------
with c as (select id from public.courses where level = '5° Básico' and letter = 'A' limit 1),
     subj as (select id from public.subjects where code = 'DEMO'),
     ay as (select id from public.academic_years where year = 2026),
     bootstrap_admin as (
       select ur.user_id as id
       from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       where r.code in ('director', 'superadmin')
       group by ur.user_id
       having count(distinct r.code) = 2
       limit 1
     )
insert into public.teacher_assignments (academic_year_id, course_id, subject_id, teacher_id, active)
select ay.id, c.id, subj.id, bootstrap_admin.id, true
from ay, c, subj, bootstrap_admin
on conflict (course_id, subject_id, teacher_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2 evaluaciones DEMO con ponderaciones distintas (40% / 60%) para poder
-- comprobar el cálculo del promedio ponderado, no solo un promedio simple.
-- No hay una restricción unique en evaluations, así que la idempotencia se
-- garantiza con "where not exists" en vez de "on conflict".
-- ---------------------------------------------------------------------------
with c as (select id from public.courses where level = '5° Básico' and letter = 'A' limit 1),
     subj as (select id from public.subjects where code = 'DEMO'),
     period1 as (
       select ap.id from public.academic_periods ap
       join public.academic_years ay on ay.id = ap.academic_year_id
       where ay.year = 2026 and ap.order_index = 1
     ),
     bootstrap_admin as (
       select ur.user_id as id
       from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       where r.code in ('director', 'superadmin')
       group by ur.user_id
       having count(distinct r.code) = 2
       limit 1
     ),
     new_evals (name, weight, eval_date) as (
       values
         ('Evaluación DEMO 1', 0.40::numeric, date '2026-04-15'),
         ('Evaluación DEMO 2', 0.60::numeric, date '2026-05-20')
     )
insert into public.evaluations (course_id, subject_id, period_id, teacher_id, name, eval_type, weight, eval_date, status)
select c.id, subj.id, period1.id, bootstrap_admin.id, ne.name, 'sumativa', ne.weight, ne.eval_date, 'aplicada'
from new_evals ne, c, subj, period1, bootstrap_admin
where not exists (
  select 1 from public.evaluations e
  where e.course_id = c.id and e.subject_id = subj.id and e.period_id = period1.id and e.name = ne.name
);

-- ---------------------------------------------------------------------------
-- Notas DEMO. Valores elegidos para verificar el promedio ponderado a mano:
--   Estudiante Uno: 6,0 (40%) y 5,0 (60%) -> promedio = 0,4x6,0 + 0,6x5,0 = 5,4
--   Estudiante Dos: 4,0 (40%) y 6,0 (60%) -> promedio = 0,4x4,0 + 0,6x6,0 = 5,2
-- ---------------------------------------------------------------------------
with c as (select id from public.courses where level = '5° Básico' and letter = 'A' limit 1),
     subj as (select id from public.subjects where code = 'DEMO'),
     period1 as (
       select ap.id from public.academic_periods ap
       join public.academic_years ay on ay.id = ap.academic_year_id
       where ay.year = 2026 and ap.order_index = 1
     ),
     eval1 as (
       select e.id from public.evaluations e, c, subj, period1
       where e.course_id = c.id and e.subject_id = subj.id and e.period_id = period1.id
         and e.name = 'Evaluación DEMO 1'
     ),
     eval2 as (
       select e.id from public.evaluations e, c, subj, period1
       where e.course_id = c.id and e.subject_id = subj.id and e.period_id = period1.id
         and e.name = 'Evaluación DEMO 2'
     ),
     bootstrap_admin as (
       select ur.user_id as id
       from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       where r.code in ('director', 'superadmin')
       group by ur.user_id
       having count(distinct r.code) = 2
       limit 1
     ),
     student1 as (select id from public.students where run = 'DEMO-001'),
     student2 as (select id from public.students where run = 'DEMO-002')
insert into public.grades (evaluation_id, student_id, score, entered_by, updated_by)
select eval1.id, student1.id, 6.0, bootstrap_admin.id, bootstrap_admin.id from eval1, student1, bootstrap_admin
union all
select eval2.id, student1.id, 5.0, bootstrap_admin.id, bootstrap_admin.id from eval2, student1, bootstrap_admin
union all
select eval1.id, student2.id, 4.0, bootstrap_admin.id, bootstrap_admin.id from eval1, student2, bootstrap_admin
union all
select eval2.id, student2.id, 6.0, bootstrap_admin.id, bootstrap_admin.id from eval2, student2, bootstrap_admin
on conflict (evaluation_id, student_id) do nothing;
