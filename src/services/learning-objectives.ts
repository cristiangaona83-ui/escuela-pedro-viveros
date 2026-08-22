import { createClient } from "@/lib/supabase/server";
import type { LearningObjectiveRow } from "@/types/database";

export interface LearningObjectiveWithSubject extends LearningObjectiveRow {
  subjects: { id: string; name: string } | null;
}

export async function listLearningObjectives(filters?: {
  subjectId?: string;
  activeOnly?: boolean;
}): Promise<LearningObjectiveWithSubject[]> {
  const supabase = await createClient();
  let query = supabase
    .from("learning_objectives")
    .select("*, subjects(id, name)")
    .order("level", { ascending: true })
    .order("code", { ascending: true });

  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.activeOnly) query = query.eq("active", true);

  const { data } = await query;
  return (data as unknown as LearningObjectiveWithSubject[]) ?? [];
}

export async function getLearningObjective(id: string): Promise<LearningObjectiveRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("learning_objectives").select("*").eq("id", id).maybeSingle();
  return data;
}
