import { createClient } from "@/lib/supabase/server";
import type { LessonPlanRow } from "@/types/database";

const SELECT_WITH_RELATIONS =
  "*, courses(level, letter), subjects(name), teacher:profiles!lesson_plans_teacher_id_fkey(id, full_name), reviewer:profiles!lesson_plans_reviewer_id_fkey(full_name), lesson_plan_objectives(learning_objective_id, learning_objectives(id, code, description))";

export interface LessonPlanWithRelations extends LessonPlanRow {
  courses: { level: string; letter: string } | null;
  subjects: { name: string } | null;
  teacher: { id: string; full_name: string } | null;
  reviewer: { full_name: string } | null;
  lesson_plan_objectives: {
    learning_objective_id: string;
    learning_objectives: { id: string; code: string; description: string } | null;
  }[];
}

export async function listLessonPlans(filters?: {
  status?: LessonPlanRow["status"];
  courseId?: string;
}): Promise<LessonPlanWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("lesson_plans").select(SELECT_WITH_RELATIONS).order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.courseId) query = query.eq("course_id", filters.courseId);

  const { data } = await query;
  return (data as unknown as LessonPlanWithRelations[]) ?? [];
}

export async function getLessonPlan(id: string): Promise<LessonPlanWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_plans").select(SELECT_WITH_RELATIONS).eq("id", id).maybeSingle();
  return data as unknown as LessonPlanWithRelations | null;
}
