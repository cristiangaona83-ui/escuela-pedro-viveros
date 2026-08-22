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

export interface CourseOption {
  course_id: string;
  course_label: string;
}

/**
 * Cursos que el usuario actual puede ver/gestionar para Asistencia. Refleja
 * exactamente el alcance de teaches_course() en RLS (asignación de docente
 * O profesor jefe), más el acceso amplio de lectura de dirección/UTP/
 * superadmin/convivencia (esta última nunca puede escribir, solo ver).
 */
export async function getTeachableCourses(): Promise<CourseOption[]> {
  const supabase = await createClient();
  const session = await getSessionContext();
  const hasBroadAccess = session?.roles.some((r) => ["director", "utp", "superadmin", "convivencia"].includes(r));

  if (hasBroadAccess) {
    const { data } = await supabase.from("courses").select("id, level, letter").eq("active", true).order("level", { ascending: true });
    return (data ?? []).map((c) => ({ course_id: c.id, course_label: `${c.level} ${c.letter}` }));
  }

  if (!session) return [];

  const [{ data: assigned }, { data: homeroom }] = await Promise.all([
    supabase
      .from("teacher_assignments")
      .select("course_id, courses(level, letter)")
      .eq("active", true)
      .eq("teacher_id", session.userId),
    supabase.from("courses").select("id, level, letter").eq("active", true).eq("homeroom_teacher_id", session.userId),
  ]);

  const byId = new Map<string, string>();
  for (const row of assigned ?? []) {
    const r = row as unknown as { course_id: string; courses: { level: string; letter: string } | null };
    if (r.courses) byId.set(r.course_id, `${r.courses.level} ${r.courses.letter}`);
  }
  for (const c of homeroom ?? []) {
    byId.set(c.id, `${c.level} ${c.letter}`);
  }

  return Array.from(byId, ([course_id, course_label]) => ({ course_id, course_label }));
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
