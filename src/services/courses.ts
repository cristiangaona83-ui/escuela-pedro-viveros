import { createClient } from "@/lib/supabase/server";

export async function listCourses() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, academic_years(year), profiles!courses_homeroom_teacher_id_fkey(full_name), enrollments(count)")
    .order("level", { ascending: true });
  return data ?? [];
}

export async function getCourse(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(
      "*, academic_years(year), profiles!courses_homeroom_teacher_id_fkey(full_name), enrollments(id, status, students(id, first_names, last_names, run)), teacher_assignments(id, subjects(name), profiles(full_name))"
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Lista liviana de cursos activos (solo id/nivel/letra), para selects en otros módulos. */
export async function listCourseOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, level, letter")
    .eq("active", true)
    .order("level", { ascending: true });
  return data ?? [];
}

export async function listAcademicYears() {
  const supabase = await createClient();
  const { data } = await supabase.from("academic_years").select("*").order("year", { ascending: false });
  return data ?? [];
}

/** Año académico marcado como vigente (academic_years.active = true). */
export async function getActiveAcademicYear(): Promise<{ id: string; year: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("academic_years").select("id, year").eq("active", true).maybeSingle();
  return data ?? null;
}

// Orden pedagógico real (Prekínder → 8° Básico). `level` es texto libre en
// courses, así que el orden alfabético no sirve ("Kínder" quedaría antes que
// "Prekínder"). Cursos con un `level` fuera de esta lista (p. ej. Educación
// Media, si se agrega en el futuro) se muestran al final, sin excluirse.
export const COURSE_LEVEL_ORDER = [
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

export function levelSortIndex(level: string): number {
  const idx = COURSE_LEVEL_ORDER.indexOf(level);
  return idx === -1 ? COURSE_LEVEL_ORDER.length : idx;
}

export async function listTeachers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("profiles(id, full_name), roles!inner(code)")
    .eq("roles.code", "docente");
  return data ?? [];
}
