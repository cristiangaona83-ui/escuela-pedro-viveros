-- =============================================================================
-- Gestión de carga docente (director/utp/superadmin).
--
-- Auditoría previa (no requiere cambios): teacher_assignments ya tiene todo
-- el RLS/GRANT necesario desde 0001-0004:
--   - teacher_assignments_select_scope: teacher_id = auth.uid() OR
--     is_academic_management() (director/utp/superadmin) -> director/utp/
--     superadmin ya ven TODA la carga (por curso o por docente, es solo un
--     filtro en la consulta, no un permiso nuevo).
--   - teacher_assignments_write_admin: "for all" para director/utp/superadmin
--     -> ya pueden asignar, cambiar docente, mover asignatura.
--   - GRANT (0004): select, insert, update a authenticated. NUNCA delete —
--     igual que el resto del esquema (courses.active, subjects.active,
--     students.active), "quitar una asignación incorrecta" se hace con
--     active = false, no con DELETE. No se agrega GRANT DELETE aquí.
-- Nada de esto se modifica. No se toca is_academic_management(), no se
-- mezcla con homeroom_teacher_id (jefaturas) en ningún punto.
--
-- Único cambio real de esquema: la tabla no tenía ninguna columna para
-- horas semanales. Se agrega, nullable (las 70 filas ya cargadas por 0017
-- no tenían este dato y no se les inventa un valor).
-- =============================================================================

alter table public.teacher_assignments
  add column weekly_hours smallint;

alter table public.teacher_assignments
  add constraint teacher_assignments_weekly_hours_check
  check (weekly_hours is null or weekly_hours > 0);
