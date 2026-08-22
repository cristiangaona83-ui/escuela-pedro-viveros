-- =============================================================================
-- Salvaguarda: la plataforma nunca puede quedar sin ningún administrador
-- activo (director o superadmin). Ejecutar después de 0001-0005.
--
-- No modifica 0001-0005. Agrega dos triggers en la base de datos (no solo en
-- la UI) porque este es exactamente el tipo de regla que debe vivir en el
-- nivel más real posible: si alguien intenta revocar el último rol
-- administrativo o desactivar al último administrador activo por cualquier
-- vía (la app, el SQL Editor, otra herramienta), la base de datos rechaza la
-- operación con un mensaje claro, en vez de dejar la plataforma sin nadie
-- que pueda volver a asignar roles o reactivar cuentas.
--
-- "Administrador" = cualquier usuario con perfil activo (profiles.active) que
-- tenga el rol 'director' o 'superadmin'. Si una persona tiene ambos roles,
-- perder uno no la deja fuera del conteo mientras conserve el otro.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- No permitir revocar (DELETE en user_roles) el último rol administrativo.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role_code text;
  v_remaining_admins int;
begin
  select r.code into v_role_code from public.roles r where r.id = old.role_id;

  if v_role_code in ('director', 'superadmin') then
    select count(*) into v_remaining_admins
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where r.code in ('director', 'superadmin')
      and p.active = true
      and ur.id <> old.id;

    if v_remaining_admins = 0 then
      raise exception 'No puedes revocar este rol: dejaría a la plataforma sin ningún administrador activo (director o superadmin).';
    end if;
  end if;

  return old;
end;
$$;

create trigger trg_prevent_last_admin_removal
  before delete on public.user_roles
  for each row execute function public.prevent_last_admin_removal();

-- ---------------------------------------------------------------------------
-- No permitir desactivar (profiles.active: true -> false) al último
-- administrador activo.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_last_admin_deactivation()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_remaining_admins int;
begin
  if old.active = true and new.active = false then
    select count(*) into v_remaining_admins
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where r.code in ('director', 'superadmin')
      and p.active = true
      and p.id <> old.id;

    if v_remaining_admins = 0 then
      raise exception 'No puedes desactivar este perfil: dejaría a la plataforma sin ningún administrador activo (director o superadmin).';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_prevent_last_admin_deactivation
  before update on public.profiles
  for each row execute function public.prevent_last_admin_deactivation();

-- Nota: ambas funciones son SECURITY DEFINER y las invoca el propio trigger
-- de Postgres al ejecutar el DELETE/UPDATE — no requieren ni necesitan un
-- GRANT EXECUTE adicional para anon/authenticated (igual que set_updated_at()
-- y handle_new_user(), ya documentado en 0004_grants.sql).
