-- =============================================================================
-- Limpieza segura de datos DEMO (supabase/seed/demo.sql).
--
-- NO ejecutar sin revisar antes la sección de PREVISUALIZACIÓN. Este archivo
-- se entrega para revisión manual, no para correr automáticamente.
--
-- Historial: un primer intento de ejecutar la Parte 2 falló con
--   "update or delete on table students violates foreign key constraint
--    certificates_student_id_fkey"
-- porque durante las pruebas finales se emitieron certificados DEMO para
-- DEMO-001/DEMO-002, y certificates.student_id usa ON DELETE RESTRICT (a
-- diferencia del resto de tablas, que usan CASCADE) -- es la única FK hacia
-- students pensada para bloquear el borrado en vez de propagarlo, porque un
-- certificado es un documento con folio que no debe desaparecer en silencio.
-- Este archivo ahora borra primero los certificados DEMO, explícitamente y
-- acotados por igual a DEMO-001/DEMO-002, antes de tocar los estudiantes.
--
-- Auditoría completa de FK hacia public.students (0001_schema.sql), para
-- descartar cualquier otro bloqueo:
--   - enrollments.student_id      -> ON DELETE CASCADE (ya cubierto)
--   - grades.student_id           -> ON DELETE CASCADE (ya cubierto, además
--                                    cascada también vía evaluation_id)
--   - attendance.student_id       -> ON DELETE CASCADE (no bloquea; se
--                                    previsualiza igual, por transparencia)
--   - student_support.student_id  -> ON DELETE CASCADE (no bloquea; se
--                                    previsualiza igual, por transparencia)
--   - pie_records.student_id      -> ON DELETE CASCADE (no bloquea; se
--                                    previsualiza igual, por transparencia)
--   - certificates.student_id     -> ON DELETE RESTRICT (ÚNICA que bloquea
--                                    -- corregido en este archivo)
-- Ninguna otra tabla del esquema referencia a students.
--
-- Qué CONSERVA siempre, sin excepción (nunca se referencia en ningún DELETE
-- de este archivo):
--   - academic_years (año 2026 incluido -- se reutiliza como año real)
--   - academic_periods (Primer/Segundo Semestre -- estructura reutilizable)
--   - school_config
--   - profiles, user_roles, roles (ningún usuario ni rol se toca)
--   - certificate_sequences (el contador de folios NO se reinicia ni se
--     toca -- los folios ya emitidos para los certificados DEMO quedan
--     simplemente "consumidos" y no se reutilizan, que es el comportamiento
--     correcto de un contador de folios; no se reinicia ninguna secuencia)
--   - cualquier certificado de un estudiante que no sea DEMO-001/DEMO-002
--
-- Qué ELIMINA, únicamente si coincide de forma inequívoca con los
-- marcadores DEMO exactos que dejó demo.sql:
--   - evaluations: solo las 2 filas con nombre exacto 'Evaluación DEMO 1' /
--     'Evaluación DEMO 2'. Cascada automática hacia sus notas.
--   - certificates: solo las filas cuyo student_id pertenece a un
--     estudiante con run IN ('DEMO-001','DEMO-002') Y notes = 'DEMO' --
--     nunca por folio, cert_type, ni ningún otro criterio que pudiera
--     alcanzar un certificado de otro estudiante.
--   - courses: solo la fila con description EXACTA
--     'Curso de demostración (DEMO).' y public_visible = false -- Y SOLO SI
--     ningún estudiante matriculado en ese curso deja de tener notes='DEMO'.
--     Cascada automática hacia enrollments, teacher_assignments y cualquier
--     evaluation restante de ese curso.
--   - students: solo run IN ('DEMO-001','DEMO-002') Y notes = 'DEMO' (ambas
--     condiciones a la vez). Cascada automática hacia enrollments, grades,
--     attendance, student_support y pie_records restantes de esos
--     estudiantes (certificates ya se eliminó explícitamente antes, porque
--     esa FK no cascada).
--   - subjects: solo code = 'DEMO' -- Y SOLO SI ya no queda ninguna
--     evaluation ni teacher_assignment que la use.
--
-- No se usa ninguna condición amplia como "entered_by = updated_by". Toda
-- condición aquí es un marcador DEMO explícito y exacto, y las tablas con
-- riesgo de tocar datos reales (courses, subjects) llevan además una
-- salvaguarda "not exists" que bloquea el DELETE si detecta algo no-DEMO
-- relacionado.
-- =============================================================================


-- =============================================================================
-- PARTE 1 — PREVISUALIZACIÓN (solo SELECT, no modifica nada). Ejecutar esto
-- primero y revisar cada resultado antes de correr la PARTE 2. Como ya hubo
-- un intento fallido previo, estas consultas reflejan el estado real actual
-- de la base -- no asumen qué quedó o no de ese intento.
-- =============================================================================

-- 1a) Evaluaciones que se eliminarían:
select id, name, course_id, subject_id, period_id, status
from public.evaluations
where name in ('Evaluación DEMO 1', 'Evaluación DEMO 2');

-- 1b) Notas que se eliminarían en cascada, junto con esas evaluaciones:
select g.id, g.evaluation_id, g.student_id, g.score
from public.grades g
where g.evaluation_id in (
  select id from public.evaluations where name in ('Evaluación DEMO 1', 'Evaluación DEMO 2')
);

-- 1c) Certificados DEMO que se eliminarían (exclusivamente de DEMO-001/DEMO-002;
-- causa del fallo anterior -- revisar que folio/cert_type sean los esperados
-- antes de continuar):
select c.id, c.folio, c.cert_type, c.status, c.issued_at, c.student_id, s.run
from public.certificates c
join public.students s on s.id = c.student_id
where s.run in ('DEMO-001', 'DEMO-002')
  and s.notes = 'DEMO';

-- 1d) Curso que se eliminaría (0 filas si la salvaguarda lo está bloqueando):
select c.id, c.level, c.letter, c.description, c.public_visible
from public.courses c
where c.description = 'Curso de demostración (DEMO).'
  and c.public_visible = false
  and not exists (
    select 1
    from public.enrollments en
    join public.students s on s.id = en.student_id
    where en.course_id = c.id
      and s.notes is distinct from 'DEMO'
  );

-- 1e) Diagnóstico: si 1d devolvió 0 filas pero SÍ existe un curso con esa
-- descripción, esta consulta muestra quién lo está bloqueando (estudiante
-- real matriculado en el curso DEMO -- requeriría revisión manual aparte):
select c.id as course_id, c.level, c.letter,
       s.id as student_id, s.first_names, s.last_names, s.notes
from public.courses c
join public.enrollments en on en.course_id = c.id
join public.students s on s.id = en.student_id
where c.description = 'Curso de demostración (DEMO).'
  and s.notes is distinct from 'DEMO';

-- 1f) Matrículas que se eliminarían en cascada (del curso DEMO):
select en.id, en.student_id, en.course_id, en.status
from public.enrollments en
join public.courses c on c.id = en.course_id
where c.description = 'Curso de demostración (DEMO).';

-- 1g) Asignaciones docentes que se eliminarían en cascada (del curso DEMO):
select ta.id, ta.course_id, ta.subject_id, ta.teacher_id
from public.teacher_assignments ta
join public.courses c on c.id = ta.course_id
where c.description = 'Curso de demostración (DEMO).';

-- 1h) Asistencia que se eliminaría en cascada, si existe (DEMO-001/DEMO-002):
select a.id, a.student_id, a.course_id, a.date, a.status
from public.attendance a
join public.students s on s.id = a.student_id
where s.run in ('DEMO-001', 'DEMO-002')
  and s.notes = 'DEMO';

-- 1i) Seguimiento pedagógico que se eliminaría en cascada, si existe:
select ss.id, ss.student_id, ss.status
from public.student_support ss
join public.students s on s.id = ss.student_id
where s.run in ('DEMO-001', 'DEMO-002')
  and s.notes = 'DEMO';

-- 1j) Registros PIE que se eliminarían en cascada, si existen:
select p.id, p.student_id, p.status
from public.pie_records p
join public.students s on s.id = p.student_id
where s.run in ('DEMO-001', 'DEMO-002')
  and s.notes = 'DEMO';

-- 1k) Estudiantes que se eliminarían:
select id, first_names, last_names, run, notes, status
from public.students
where run in ('DEMO-001', 'DEMO-002')
  and notes = 'DEMO';

-- 1l) Asignatura que se eliminaría (0 filas si la salvaguarda lo bloquea):
select s.id, s.code, s.name
from public.subjects s
where s.code = 'DEMO'
  and not exists (select 1 from public.evaluations e where e.subject_id = s.id)
  and not exists (select 1 from public.teacher_assignments ta where ta.subject_id = s.id);


-- =============================================================================
-- PARTE 2 — DELETE real. Ejecutar solo después de revisar la Parte 1 y
-- confirmar que cada resultado es exactamente lo esperado.
-- Orden: certificados y evaluaciones primero (independientes entre sí),
-- luego curso, luego estudiantes (ya sin nada que lo bloquee), luego
-- asignatura. certificate_sequences no se toca en ningún paso.
-- =============================================================================

-- 2a) Evaluaciones DEMO (por nombre exacto) -- cascada automática hacia sus notas.
delete from public.evaluations
where name in ('Evaluación DEMO 1', 'Evaluación DEMO 2');

-- 2b) Certificados DEMO -- exclusivamente los de DEMO-001/DEMO-002. Debe
-- ejecutarse antes de borrar los estudiantes: certificates.student_id usa
-- ON DELETE RESTRICT, no CASCADE. No toca certificate_sequences ni ningún
-- certificado de otro estudiante.
delete from public.certificates c
using public.students s
where c.student_id = s.id
  and s.run in ('DEMO-001', 'DEMO-002')
  and s.notes = 'DEMO';

-- 2c) Curso DEMO, solo si ningún estudiante matriculado en él es real --
-- cascada automática hacia matrículas, asignaciones docentes y cualquier
-- evaluación restante de ese curso.
delete from public.courses c
where c.description = 'Curso de demostración (DEMO).'
  and c.public_visible = false
  and not exists (
    select 1
    from public.enrollments en
    join public.students s on s.id = en.student_id
    where en.course_id = c.id
      and s.notes is distinct from 'DEMO'
  );

-- 2d) Estudiantes DEMO (run + notes exactos) -- cascada automática hacia
-- cualquier enrollment/grade/attendance/student_support/pie_records
-- restante. Los certificados ya se eliminaron en 2b, así que esta vez la
-- FK con ON DELETE RESTRICT no debería bloquear nada.
delete from public.students
where run in ('DEMO-001', 'DEMO-002')
  and notes = 'DEMO';

-- 2e) Asignatura DEMO, solo si ya no queda ninguna evaluación ni asignación
-- docente que la use.
delete from public.subjects s
where s.code = 'DEMO'
  and not exists (select 1 from public.evaluations e where e.subject_id = s.id)
  and not exists (select 1 from public.teacher_assignments ta where ta.subject_id = s.id);
