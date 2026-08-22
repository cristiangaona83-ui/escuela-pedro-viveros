-- Revierte exactamente los privilegios otorgados en
-- 0012_service_role_admin_grants.sql. Esos GRANT fueron temporales, para una
-- única operación administrativa puntual (sincronizar public.profiles.email
-- al cambiar el correo de un usuario vía supabase.auth.admin.updateUserById()
-- desde un script servidor de un solo uso, ya eliminado). Con esa operación
-- completada, service_role no necesita conservar acceso permanente de tabla
-- sobre profiles/user_roles/roles -- BYPASSRLS sigue intacto para su uso
-- normal en el resto de la aplicación (Route Handlers autenticados, etc.),
-- esto solo retira el acceso de tabla adicional que ya cumplió su propósito.
--
-- No se modifica ninguna migración histórica (0001-0012 quedan intactas,
-- reflejando exactamente lo que se ejecutó en su momento). Esta es la
-- migración incremental que deja el estado final seguro: sin estos GRANT
-- persistiendo más allá de lo necesario.
revoke select, update on public.profiles from service_role;
revoke select on public.user_roles from service_role;
revoke select on public.roles from service_role;
