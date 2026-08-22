import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, RoleCode } from "@/types/database";

export { ROLE_LABELS } from "@/features/auth/role-labels";

export interface SessionContext {
  userId: string;
  profile: ProfileRow | null;
  roles: RoleCode[];
}

/** Sesión + perfil + roles del usuario autenticado (Server Components / Server Actions). */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_roles")
      .select("roles(code)")
      .eq("user_id", user.id),
  ]);

  const roles = (roleRows ?? [])
    .map((r) => (r as unknown as { roles: { code: RoleCode } | null }).roles?.code)
    .filter((c): c is RoleCode => Boolean(c));

  return { userId: user.id, profile: profile ?? null, roles };
}

export function hasAnyRole(roles: RoleCode[], allowed?: string[]) {
  if (!allowed || allowed.length === 0) return true;
  return roles.some((r) => allowed.includes(r));
}
