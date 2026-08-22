import { createClient } from "@/lib/supabase/server";
import type { StudentSupportRow } from "@/types/database";

export interface StudentSupportWithRelations extends StudentSupportRow {
  students: { first_names: string; last_names: string } | null;
  subjects: { name: string } | null;
  responsible: { full_name: string } | null;
}

export async function listSupportRecords(filters?: {
  status?: StudentSupportRow["status"];
}): Promise<StudentSupportWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("student_support")
    .select("*, students(first_names, last_names), subjects(name), responsible:profiles!student_support_responsible_id_fkey(full_name)")
    .order("event_date", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data } = await query;
  return (data as unknown as StudentSupportWithRelations[]) ?? [];
}

export async function getSupportRecord(id: string): Promise<StudentSupportWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_support")
    .select("*, students(first_names, last_names), subjects(name), responsible:profiles!student_support_responsible_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as StudentSupportWithRelations | null;
}
