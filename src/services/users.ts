import { createClient } from "@/lib/supabase/server";

export async function listProfilesWithRoles() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
  const { data: userRoles } = await supabase.from("user_roles").select("user_id, roles(code, name)");

  return (profiles ?? []).map((p) => ({
    ...p,
    roles: (userRoles ?? [])
      .filter((ur) => ur.user_id === p.id)
      .map((ur) => (ur as unknown as { roles: { code: string; name: string } | null }).roles)
      .filter((r): r is { code: string; name: string } => Boolean(r)),
  }));
}

export async function listRoles() {
  const supabase = await createClient();
  const { data } = await supabase.from("roles").select("*").order("name", { ascending: true });
  return data ?? [];
}
