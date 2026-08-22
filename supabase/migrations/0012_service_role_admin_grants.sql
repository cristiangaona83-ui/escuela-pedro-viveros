-- Migración incremental mínima: otorga a service_role únicamente los
-- privilegios de tabla necesarios para operaciones administrativas puntuales
-- desde un script servidor (ej. sincronizar public.profiles.email al cambiar
-- el correo de un usuario vía supabase.auth.admin.updateUserById()).
--
-- Contexto: BYPASSRLS (que service_role ya tiene por defecto) exime de las
-- políticas RLS, pero NO sustituye los privilegios de tabla de SQL estándar.
-- Ninguna de las migraciones 0001-0011 otorga ni revoca privilegios a
-- service_role (confirmado: "service_role" no aparece en ningún GRANT/REVOKE
-- de este proyecto) -- si el diagnóstico muestra que carece de SELECT/UPDATE
-- en estas tablas, es un vacío de aprovisionamiento ajeno a estas migraciones,
-- no algo que ellas hayan quitado.
--
-- No se modifica ninguna migración histórica. No se amplía nada para anon ni
-- authenticated. No se toca RLS -- service_role sigue bypasseándola igual que
-- siempre; esto solo agrega el permiso de tabla subyacente que RLS presupone.
grant select, update on public.profiles to service_role;
grant select on public.user_roles to service_role;
grant select on public.roles to service_role;
