import { createClient } from "@/lib/supabase/server";
import type { StudentRow } from "@/types/database";
import { getActiveAcademicYear, levelSortIndex } from "@/services/courses";

export interface StudentWithCourse extends StudentRow {
  course_label: string | null;
  course_id: string | null;
}

export async function listStudents(search?: string): Promise<StudentWithCourse[]> {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, enrollments(status, courses(id, level, letter, academic_years(year)))")
    .order("last_names", { ascending: true });

  if (search) {
    query = query.or(`first_names.ilike.%${search}%,last_names.ilike.%${search}%,run.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((s) => {
    type EnrollmentJoin = {
      status: string;
      courses: { id: string; level: string; letter: string; academic_years: { year: number } | null } | null;
    };
    const enrollments = (s as unknown as { enrollments: EnrollmentJoin[] }).enrollments ?? [];
    const active = enrollments.find((e) => e.status === "activa");
    const course_label = active?.courses ? `${active.courses.level} ${active.courses.letter}` : null;
    const course_id = active?.courses?.id ?? null;
    const { enrollments: _omit, ...rest } = s as unknown as StudentRow & { enrollments: unknown };
    void _omit;
    return { ...rest, course_label, course_id } as StudentWithCourse;
  });
}

export interface StudentCourseFolder {
  id: string;
  level: string;
  letter: string;
  courseLabel: string;
  students: StudentWithCourse[];
}

/**
 * Agrupa a TODOS los estudiantes (mismo listStudents, sin filtro de
 * búsqueda) en carpetas por curso del año académico vigente, más una
 * carpeta separada para quienes no tienen matrícula activa en un curso de
 * ese año (retirados, egresados o cualquier otro caso) — así nadie
 * desaparece del listado respecto del comportamiento actual, solo cambia
 * cómo se organiza la navegación.
 */
export async function listStudentsGroupedByCourse(): Promise<{
  academicYearId: string | null;
  courseFolders: StudentCourseFolder[];
  withdrawnStudents: StudentWithCourse[];
}> {
  const [students, year] = await Promise.all([listStudents(), getActiveAcademicYear()]);
  if (!year) return { academicYearId: null, courseFolders: [], withdrawnStudents: students };

  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, level, letter")
    .eq("academic_year_id", year.id)
    .eq("active", true);

  const courseIds = new Set((courses ?? []).map((c) => c.id));
  const byCourse = new Map<string, StudentWithCourse[]>();
  const withdrawnStudents: StudentWithCourse[] = [];

  for (const s of students) {
    if (s.course_id && courseIds.has(s.course_id)) {
      const list = byCourse.get(s.course_id) ?? [];
      list.push(s);
      byCourse.set(s.course_id, list);
    } else {
      withdrawnStudents.push(s);
    }
  }

  const courseFolders = (courses ?? [])
    .map((c) => ({
      id: c.id,
      level: c.level,
      letter: c.letter,
      courseLabel: c.letter ? `${c.level} ${c.letter}` : c.level,
      students: byCourse.get(c.id) ?? [],
    }))
    .sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter, "es"));

  return { academicYearId: year.id, courseFolders, withdrawnStudents };
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(
      "*, enrollments(id, status, academic_year_id, course_id, enrolled_at, enrollment_number, origin_school, origin_course, admission_condition, withdrawal_reason, withdrawn_at, reactivated_at, notes, courses(level, letter, academic_years(year), profiles!courses_homeroom_teacher_id_fkey(full_name)))"
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export interface StudentEnrollmentJoin {
  id: string;
  status: string;
  academic_year_id: string;
  course_id: string;
  enrolled_at: string;
  enrollment_number: string | null;
  origin_school: string | null;
  origin_course: string | null;
  admission_condition: string | null;
  withdrawal_reason: string | null;
  withdrawn_at: string | null;
  reactivated_at: string | null;
  notes: string | null;
  courses: {
    level: string;
    letter: string;
    academic_years: { year: number } | null;
    profiles: { full_name: string } | null;
  } | null;
}

/** Matrícula activa del estudiante (para el botón de retiro y la Ficha de Matrícula). */
export function findActiveEnrollment(student: { enrollments?: unknown }) {
  const enrollments = (student.enrollments as StudentEnrollmentJoin[] | undefined) ?? [];
  return enrollments.find((e) => e.status === "activa") ?? null;
}

/** Nombre del profesor/a jefe de un curso, siempre desde
 * `courses.homeroom_teacher_id` — nunca hardcodear este dato. */
export async function getHomeroomTeacherName(courseId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("profiles!courses_homeroom_teacher_id_fkey(full_name)")
    .eq("id", courseId)
    .maybeSingle();
  const profile = (data as unknown as { profiles: { full_name: string } | null } | null)?.profiles;
  return profile?.full_name ?? null;
}
