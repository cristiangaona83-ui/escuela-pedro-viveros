import { createClient } from "@/lib/supabase/server";

export async function listCertificates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("*, students(first_names, last_names, run), academic_years(year)")
    .order("issued_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function listActiveStudents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, first_names, last_names, run")
    .eq("status", "matriculado")
    .order("last_names", { ascending: true });
  return data ?? [];
}
