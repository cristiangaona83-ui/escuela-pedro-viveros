import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";

export interface CourseSubjectOption {
  course_id: string;
  course_label: string;
  subject_id: string;
  subject_name: string;
}

/** Combinaciones curso+asignatura que el usuario actual puede gestionar. */
export async function getTeachableCourseSubjects(): Promise<CourseSubjectOption[]> {
  const supabase = await createClient();
  const session = await getSessionContext();
  const isManagement = session?.roles.some((r) => ["director", "utp", "superadmin"].includes(r));

  let query = supabase
    .from("teacher_assignments")
    .select("course_id, subject_id, active, courses(level, letter), subjects(name)")
    .eq("active", true);

  if (!isManagement && session) {
    query = query.eq("teacher_id", session.userId);
  }

  const { data } = await query;
  return (data ?? []).map((row) => {
    const r = row as unknown as {
      course_id: string;
      subject_id: string;
      courses: { level: string; letter: string } | null;
      subjects: { name: string } | null;
    };
    return {
      course_id: r.course_id,
      course_label: r.courses ? `${r.courses.level} ${r.courses.letter}` : "",
      subject_id: r.subject_id,
      subject_name: r.subjects?.name ?? "",
    };
  });
}

export async function listOpenPeriods() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_periods")
    .select("*, academic_years(year)")
    .order("order_index", { ascending: true })
    .returns<(import("@/types/database").AcademicPeriodRow & { academic_years: { year: number } | null })[]>();
  return data ?? [];
}
