import { createClient } from "@/lib/supabase/server";

/** Asistencia de un estudiante, reutilizando la tabla attendance existente
 * (sin duplicar información) — misma RLS que el resto de Asistencia. */
export async function listAttendanceForStudent(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, date, status, observation, courses(level, letter)")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(200);
  return data ?? [];
}

/** Seguimiento pedagógico (Apoyos) de un estudiante, reutilizando
 * student_support — misma RLS que el módulo Seguimiento Pedagógico. */
export async function listSupportForStudent(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_support")
    .select("id, event_date, status, difficulty, strength, action, follow_up, subjects(name), profiles(full_name)")
    .eq("student_id", studentId)
    .order("event_date", { ascending: false });
  return data ?? [];
}

/** Registros PIE de un estudiante, reutilizando pie_records — misma RLS
 * (estrictamente confidencial) que el módulo PIE. */
export async function listPieRecordsForStudent(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pie_records")
    .select("id, support_type, diagnosis, status, created_at, coordinator:profiles!pie_records_coordinator_id_fkey(full_name), professional:profiles!pie_records_professional_id_fkey(full_name)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Historial de auditoría de un estudiante — reutiliza audit_logs, sin
 * tabla nueva. Solo director/superadmin tienen SELECT sobre audit_logs
 * (RLS ya existente); para el resto, esta consulta simplemente devuelve
 * vacío. */
export async function listAuditHistoryForStudent(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, module, created_at, details, profiles(full_name)")
    .eq("entity_id", studentId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

/** Todas las matrículas históricas de un estudiante (no solo la activa),
 * reutilizando enrollments — para el historial de cursos. */
export async function listEnrollmentHistory(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at, courses(level, letter, academic_years(year))")
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });
  return data ?? [];
}
