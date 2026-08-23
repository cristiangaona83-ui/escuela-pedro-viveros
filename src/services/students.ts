import { createClient } from "@/lib/supabase/server";
import type { StudentRow, GuardianContactRow } from "@/types/database";

export interface StudentWithCourse extends StudentRow {
  course_label: string | null;
}

export async function listStudents(search?: string): Promise<StudentWithCourse[]> {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, enrollments(status, courses(level, letter, academic_years(year)))")
    .order("last_names", { ascending: true });

  if (search) {
    query = query.or(`first_names.ilike.%${search}%,last_names.ilike.%${search}%,run.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((s) => {
    type EnrollmentJoin = {
      status: string;
      courses: { level: string; letter: string; academic_years: { year: number } | null } | null;
    };
    const enrollments = (s as unknown as { enrollments: EnrollmentJoin[] }).enrollments ?? [];
    const active = enrollments.find((e) => e.status === "activa");
    const course_label = active?.courses ? `${active.courses.level} ${active.courses.letter}` : null;
    const { enrollments: _omit, ...rest } = s as unknown as StudentRow & { enrollments: unknown };
    void _omit;
    return { ...rest, course_label } as StudentWithCourse;
  });
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*, guardians(*), enrollments(id, status, academic_year_id, courses(level, letter, academic_years(year)))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Matrícula activa del estudiante (para el botón de retiro). */
export function findActiveEnrollment(student: { enrollments?: unknown }) {
  type EnrollmentJoin = {
    id: string;
    status: string;
    academic_year_id: string;
    courses: { level: string; letter: string; academic_years: { year: number } | null } | null;
  };
  const enrollments = (student.enrollments as EnrollmentJoin[] | undefined) ?? [];
  return enrollments.find((e) => e.status === "activa") ?? null;
}

/** Datos mínimos del apoderado (sin RUN) vía la vista public.guardian_contact_info. */
export async function getGuardianContact(guardianId: string): Promise<GuardianContactRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("guardian_contact_info").select("*").eq("id", guardianId).maybeSingle();
  return data;
}
