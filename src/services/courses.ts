import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SELECTED_YEAR_COOKIE } from "@/lib/academic-year-cookie";

/** Cursos del año de trabajo (o del año indicado). */
export async function listCourses(academicYearId?: string) {
  const supabase = await createClient();
  const yearId = academicYearId ?? (await getActiveAcademicYear())?.id;
  let query = supabase
    .from("courses")
    .select("*, academic_years(year), profiles!courses_homeroom_teacher_id_fkey(full_name), enrollments(count)")
    .order("level", { ascending: true });
  if (yearId) query = query.eq("academic_year_id", yearId);
  const { data } = await query;
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

/** Lista liviana de cursos activos del año de trabajo (solo id/nivel/letra), para selects en otros módulos. */
export async function listCourseOptions(academicYearId?: string) {
  const supabase = await createClient();
  const yearId = academicYearId ?? (await getActiveAcademicYear())?.id;
  let query = supabase.from("courses").select("id, level, letter").eq("active", true).order("level", { ascending: true });
  if (yearId) query = query.eq("academic_year_id", yearId);
  const { data } = await query;
  return data ?? [];
}

export async function listAcademicYears() {
  const supabase = await createClient();
  const { data } = await supabase.from("academic_years").select("*").order("year", { ascending: true });
  return data ?? [];
}

/** Año académico VIGENTE (academic_years.active = true; solo uno). Si no hubiera ninguno marcado, el más reciente. */
export async function getCurrentAcademicYear(): Promise<{ id: string; year: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("academic_years").select("id, year").eq("active", true).maybeSingle();
  if (data) return data;
  const { data: latest } = await supabase.from("academic_years").select("id, year").order("year", { ascending: false }).limit(1).maybeSingle();
  return latest ?? null;
}

/**
 * Año de TRABAJO de la plataforma: el que la persona eligió en el selector de
 * año de la barra superior (cookie `pv_year`), y si no eligió ninguno, el año
 * vigente. Todos los módulos (cursos, estudiantes, evaluaciones, informes...)
 * lo usan como año por defecto, así que cambiarlo en el selector cambia la
 * plataforma entera. El nombre se mantiene por compatibilidad con los módulos
 * que ya lo llaman.
 */
export async function getActiveAcademicYear(): Promise<{ id: string; year: number } | null> {
  let selected: string | undefined;
  try {
    selected = (await cookies()).get(SELECTED_YEAR_COOKIE)?.value;
  } catch {
    selected = undefined; // fuera de una solicitud (sin cookies disponibles)
  }
  if (selected) {
    const supabase = await createClient();
    const { data } = await supabase.from("academic_years").select("id, year").eq("id", selected).maybeSingle();
    if (data) return data;
  }
  return getCurrentAcademicYear();
}

export { COURSE_LEVEL_ORDER, levelSortIndex } from "@/lib/course-levels";

export async function listTeachers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("profiles(id, full_name), roles!inner(code)")
    .eq("roles.code", "docente");
  return data ?? [];
}
