import { createClient } from "@/lib/supabase/server";

export interface CourseRosterStudent {
  id: string;
  first_names: string;
  last_names: string;
  run: string;
  birth_date: string | null;
  enrollment_status: "activa" | "retirada" | "trasladada";
}

export interface CourseRoster {
  courseLabel: string;
  academicYear: number;
  students: CourseRosterStudent[];
}

/** Nómina de un curso (matriculados, ordenados por apellido) para Listados por curso. */
export async function getCourseRoster(courseId: string): Promise<CourseRoster | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("level, letter, academic_years(year)")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return null;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("status, students(id, first_names, last_names, run, birth_date)")
    .eq("course_id", courseId);

  type Row = {
    status: "activa" | "retirada" | "trasladada";
    students: { id: string; first_names: string; last_names: string; run: string; birth_date: string | null } | null;
  };

  const students = ((enrollments ?? []) as unknown as Row[])
    .filter((r) => r.students)
    .map((r) => ({
      id: r.students!.id,
      first_names: r.students!.first_names,
      last_names: r.students!.last_names,
      run: r.students!.run,
      birth_date: r.students!.birth_date,
      enrollment_status: r.status,
    }))
    .sort((a, b) => a.last_names.localeCompare(b.last_names, "es"));

  const academicYear = (course as unknown as { academic_years: { year: number } | null }).academic_years?.year ?? 0;

  return {
    courseLabel: `${course.level} ${course.letter}`,
    academicYear,
    students,
  };
}

/** Cursos de un año académico específico (para el selector de Listados por curso). */
export async function listCoursesByYear(academicYearId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, level, letter")
    .eq("academic_year_id", academicYearId)
    .order("level", { ascending: true });
  return data ?? [];
}
