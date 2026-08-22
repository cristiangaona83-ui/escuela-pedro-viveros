import { createClient } from "@/lib/supabase/server";

export interface ProfileRoleEntry {
  userRoleId: string;
  code: string;
  name: string;
}

export async function listProfilesWithRoles() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
  const { data: userRoles } = await supabase.from("user_roles").select("id, user_id, roles(code, name)");

  return (profiles ?? []).map((p) => ({
    ...p,
    roles: (userRoles ?? [])
      .filter((ur) => ur.user_id === p.id)
      .map((ur) => {
        const r = (ur as unknown as { id: string; roles: { code: string; name: string } | null });
        return r.roles ? { userRoleId: r.id, code: r.roles.code, name: r.roles.name } : null;
      })
      .filter((r): r is ProfileRoleEntry => Boolean(r)),
  }));
}

export async function listRoles() {
  const supabase = await createClient();
  const { data } = await supabase.from("roles").select("*").order("name", { ascending: true });
  return data ?? [];
}
