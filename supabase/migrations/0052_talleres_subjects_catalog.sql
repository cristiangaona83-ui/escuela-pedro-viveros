-- =============================================================================
-- Catálogo de Asignaturas -- agrega Taller 1, Taller 2 y Taller 3
-- =============================================================================
-- `subjects` ya es un catálogo plano y libre (id, code único, name, active),
-- sin ninguna columna ni restricción de curso/nivel -- la asociación
-- curso↔asignatura vive enteramente en `teacher_assignments` (carga
-- docente), exactamente igual para cualquier asignatura. Por eso esto es
-- solo un INSERT de datos: agregar los talleres al catálogo basta para que
-- aparezcan como opción en Asignaturas y en Carga docente, y para que se
-- comporten como cualquier otra asignatura en Evaluaciones/Calificaciones
-- una vez asociados -- no se necesita ninguna tabla, columna, política ni
-- lógica nueva.
--
-- No hay restricción técnica que limite una asignatura a ciertos niveles
-- (Prekínder/Kínder incluidos): quién asocia Taller 1/2/3 a qué curso queda,
-- como con el resto del catálogo, a criterio de quien administra Carga
-- docente (director/UTP/superadmin) -- 1° a 8° Básico según lo solicitado.
--
-- Idempotente por nombre (no solo por el `code` único): si alguno de estos
-- talleres ya existiera con otro código, no se duplica.
-- =============================================================================

insert into public.subjects (code, name)
select 'TALLER1', 'Taller 1'
where not exists (select 1 from public.subjects where name = 'Taller 1');

insert into public.subjects (code, name)
select 'TALLER2', 'Taller 2'
where not exists (select 1 from public.subjects where name = 'Taller 2');

insert into public.subjects (code, name)
select 'TALLER3', 'Taller 3'
where not exists (select 1 from public.subjects where name = 'Taller 3');
