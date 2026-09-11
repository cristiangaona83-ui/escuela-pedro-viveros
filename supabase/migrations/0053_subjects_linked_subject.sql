-- =============================================================================
-- Asignaturas -- vínculo opcional a una asignatura troncal (para Talleres)
-- =============================================================================
-- Permite que una asignatura (ej. "Taller 1") se vincule a otra (ej.
-- "Lenguaje y Comunicación") para que su nota aparezca en el informe
-- académico -- como su propia fila, con su propio promedio, igual que
-- cualquier asignatura -- pero SIN incidir en el promedio general del
-- informe (`generalAverageFromRows` en src/services/report-data.ts excluye
-- toda asignatura que tenga `linked_subject_id` no nulo).
--
-- Columna aditiva y nullable sobre el catálogo ya existente (`subjects`):
-- ninguna asignatura sin vínculo cambia de comportamiento. Sin lógica
-- especial para "Taller" -- cualquier asignatura puede vincularse a
-- cualquier otra, la exclusión del promedio general depende solo de tener
-- el vínculo seteado, no del nombre.
--
-- Auto-referencia a subjects(id): un check evita que una asignatura se
-- vincule a sí misma (no se valida contra cadenas más largas -- A vinculada
-- a B vinculada a C -- porque hoy solo se resuelve un nivel: report-data.ts
-- nunca sigue linked_subject_id de forma recursiva, así que una cadena no
-- rompe nada, solo sería una configuración administrativa sin sentido).
-- =============================================================================

alter table public.subjects
  add column if not exists linked_subject_id uuid references public.subjects(id) on delete set null;

alter table public.subjects
  add constraint subjects_linked_subject_not_self check (linked_subject_id is null or linked_subject_id <> id);
