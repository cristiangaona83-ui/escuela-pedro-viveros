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

export async function listAcademicYears() {
  const supabase = await createClient();
  const { data } = await supabase.from("academic_years").select("*").order("year", { ascending: false });
  return data ?? [];
}

export async function listTeachers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("profiles(id, full_name), roles!inner(code)")
    .eq("roles.code", "docente");
  return data ?? [];
}
