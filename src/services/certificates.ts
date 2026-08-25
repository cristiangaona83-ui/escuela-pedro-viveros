import { createClient } from "@/lib/supabase/server";

export async function listCertificates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("*, students(first_names, last_names, run), academic_years(year)")
    .order("issued_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function listActiveStudents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, first_names, last_names, run")
    .eq("status", "matriculado")
    .order("last_names", { ascending: true });
  return data ?? [];
}

export interface AlumnoRegularCourseFolder {
  id: string;
  level: string;
  letter: string;
  courseLabel: string;
  students: { id: string; first_names: string; last_names: string; run: string }[];
}

// Orden pedagógico real (Prekínder → 8° Básico). `level` es texto libre en
// courses, así que el orden alfabético no sirve ("Kínder" quedaría antes que
// "Prekínder"). Cursos con un `level` fuera de esta lista (p. ej. Educación
// Media, si se agrega en el futuro) se muestran al final, sin excluirse.
const COURSE_LEVEL_ORDER = [
  "Prekínder",
  "Kínder",
  "1° Básico",
  "2° Básico",
  "3° Básico",
  "4° Básico",
  "5° Básico",
  "6° Básico",
  "7° Básico",
  "8° Básico",
];

function levelSortIndex(level: string): number {
  const idx = COURSE_LEVEL_ORDER.indexOf(level);
  return idx === -1 ? COURSE_LEVEL_ORDER.length : idx;
}

/**
 * Cursos del año académico activo con su nómina de matrícula vigente, para
 * la selección por curso del Certificado de Alumno Regular. Mismo criterio
 * de "vigente" que el resto del módulo (students.status = 'matriculado',
 * igual que listActiveStudents), sumado al estándar de matrícula activa por
 * curso ya usado en getCourseRoster (enrollments.status = 'activa') para
 * poder agrupar por curso.
 */
export async function listAlumnoRegularCourseFolders(): Promise<{
  academicYearId: string | null;
  academicYear: number | null;
  folders: AlumnoRegularCourseFolder[];
}> {
  const supabase = await createClient();

  const { data: year } = await supabase.from("academic_years").select("id, year").eq("active", true).maybeSingle();
  if (!year) return { academicYearId: null, academicYear: null, folders: [] };

  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from("courses").select("id, level, letter").eq("academic_year_id", year.id).eq("active", true),
    supabase
      .from("enrollments")
      .select("course_id, students(id, first_names, last_names, run, status)")
      .eq("academic_year_id", year.id)
      .eq("status", "activa"),
  ]);

  type EnrollmentRow = {
    course_id: string;
    students: { id: string; first_names: string; last_names: string; run: string; status: string } | null;
  };

  const rosterByCourse = new Map<string, AlumnoRegularCourseFolder["students"]>();
  for (const row of (enrollments ?? []) as unknown as EnrollmentRow[]) {
    if (!row.students || row.students.status !== "matriculado") continue;
    const list = rosterByCourse.get(row.course_id) ?? [];
    list.push({ id: row.students.id, first_names: row.students.first_names, last_names: row.students.last_names, run: row.students.run });
    rosterByCourse.set(row.course_id, list);
  }

  const folders = (courses ?? [])
    .map((c) => ({
      id: c.id,
      level: c.level,
      letter: c.letter,
      courseLabel: c.letter ? `${c.level} ${c.letter}` : c.level,
      students: (rosterByCourse.get(c.id) ?? []).sort(
        (a, b) => a.last_names.localeCompare(b.last_names, "es") || a.first_names.localeCompare(b.first_names, "es")
      ),
    }))
    .sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter, "es"));

  return { academicYearId: year.id, academicYear: year.year, folders };
}
