-- =============================================================================
-- Ajusta el catálogo de Asignaturas al nombre y estructura oficial del Plan
-- de Estudio de Enseñanza Básica (ver certificados: Semestral, Anual, Cierre
-- de Año Escolar).
-- =============================================================================
-- 1) "Inglés" (código ING, usado desde el inicio del catálogo, ver
--    0001_schema.sql) pasa a llamarse "Idioma Extranjero: Inglés", su nombre
--    oficial en el Plan de Estudio (5° a 8° Básico). Es un simple UPDATE de
--    nombre sobre la misma fila -- no se toca su `id` ni su `code`, así que
--    ninguna evaluación, calificación ni asignación de Carga Docente que ya
--    la use se ve afectada; solo cambia el texto que se muestra.
--
-- 2) De 7° a 8° Básico el Plan de Estudio usa nombres y una agrupación
--    distintos a los de 1° a 6°: "Lengua y Literatura" en vez de "Lenguaje y
--    Comunicación", y "Artes Visuales y Música" como una sola asignatura en
--    vez de dos separadas. Como `subjects` es un catálogo plano sin
--    restricción de nivel (la asociación curso↔asignatura vive en
--    `teacher_assignments`, ver 0052_talleres_subjects_catalog.sql), estas
--    quedan como asignaturas NUEVAS e independientes: así 1°-6° siguen
--    usando "Lenguaje y Comunicación" y las artes por separado sin cambios,
--    y quien administra Carga Docente puede asociar estas dos nuevas a los
--    cursos de 7° y 8° Básico cuando corresponda.
--
-- Idempotente por nombre, mismo criterio que 0052.
-- =============================================================================

update public.subjects set name = 'Idioma Extranjero: Inglés' where name = 'Inglés';

insert into public.subjects (code, name)
select 'LENLIT', 'Lengua y Literatura'
where not exists (select 1 from public.subjects where name = 'Lengua y Literatura');

insert into public.subjects (code, name)
select 'ARTMUS', 'Artes Visuales y Música'
where not exists (select 1 from public.subjects where name = 'Artes Visuales y Música');
