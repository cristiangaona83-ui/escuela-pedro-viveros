-- =============================================================================
-- Renombra la etiqueta visible del rol 'pie' a "Coordinadora PIE".
-- No modifica el código 'pie', RLS, permisos, navegación ni user_roles.
-- =============================================================================
update public.roles set name = 'Coordinadora PIE' where code = 'pie';
