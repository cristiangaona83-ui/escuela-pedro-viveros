import { createClient } from "@/lib/supabase/server";

export async function listEvaluations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluations")
    .select("*, courses(level, letter), subjects(name), academic_periods(name)")
    .order("eval_date", { ascending: false });
  return data ?? [];
}
