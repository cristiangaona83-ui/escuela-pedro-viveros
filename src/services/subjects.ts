import { createClient } from "@/lib/supabase/server";

/** Lista liviana de asignaturas activas (id/nombre), para selects en otros módulos. */
export async function listSubjectOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });
  return data ?? [];
}
