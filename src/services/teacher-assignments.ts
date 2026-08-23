import { createClient } from "@/lib/supabase/server";

export interface TeacherAssignmentWithRelations {
  id: string;
  active: boolean;
  weekly_hours: number | null;
  course_id: string;
  subject_id: string;
  teacher_id: string;
  courses: { level: string; letter: string } | null;
  subjects: { name: string } | null;
  profiles: { id: string; full_name: string } | null;
}

/** Carga docente completa, filtrable por curso y/o por docente. */
export async function listTeacherAssignments(filters?: {
  courseId?: string;
  teacherId?: string;
}): Promise<TeacherAssignmentWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("teacher_assignments")
    .select("id, active, weekly_hours, course_id, subject_id, teacher_id, courses(level, letter), subjects(name), profiles(id, full_name)")
    .order("created_at", { ascending: true });

  if (filters?.courseId) query = query.eq("course_id", filters.courseId);
  if (filters?.teacherId) query = query.eq("teacher_id", filters.teacherId);

  const { data } = await query;
  return (data ?? []) as unknown as TeacherAssignmentWithRelations[];
}
