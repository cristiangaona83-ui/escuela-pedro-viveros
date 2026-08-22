-- Fase 8 (PIE): agrega dos columnas administrativas a pie_records para cubrir
-- "seguimiento" y "observaciones", pedidos por el usuario y ausentes del
-- esquema original (0001_schema.sql). No son campos clínicos ni diagnósticos
-- nuevos -- mismo patrón ya usado en student_support.follow_up y agregado en
-- lesson_plans.observations (0007_lesson_plans_guard.sql).
--
-- No se requiere ningún cambio de RLS ni de GRANT: "pie_records_select_scope" y
-- "pie_records_write_scope" (0002_rls.sql) filtran por rol a nivel de fila, no
-- por columna, así que ya cubren estas dos columnas nuevas igual que el resto
-- de la tabla; el GRANT existente en 0004_grants.sql es a nivel de tabla
-- (select, insert, update), también sin necesidad de ajuste.
alter table public.pie_records add column if not exists follow_up text;
alter table public.pie_records add column if not exists observations text;
