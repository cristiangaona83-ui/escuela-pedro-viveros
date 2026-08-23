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
    .select(
      "id, status, enrolled_at, enrollment_number, withdrawal_reason, withdrawn_at, reactivated_at, notes, courses(level, letter, academic_years(year))"
    )
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });
  return data ?? [];
}

/** Personas autorizadas para retirar al estudiante — solo las activas
 * (student_pickup_authorizations, 0020). */
export async function listPickupAuthorizations(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_pickup_authorizations")
    .select("*")
    .eq("student_id", studentId)
    .eq("active", true)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** Restricción de retiro (alerta mínima) — a lo sumo una fila por
 * estudiante (student_pickup_restrictions, 0020). Consultar solo cuando el
 * rol ya esté autorizado (ver RLS y page.tsx). */
export async function getPickupRestriction(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_pickup_restrictions")
    .select("student_id, note, created_at")
    .eq("student_id", studentId)
    .maybeSingle();
  return data;
}

/** Autorizaciones administrativas del estudiante (uso de imagen, salidas
 * pedagógicas, etc. — student_authorizations, 0020). */
export async function listStudentAuthorizations(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_authorizations")
    .select("*")
    .eq("student_id", studentId)
    .order("auth_type", { ascending: true });
  return data ?? [];
}

/** Documentación de matrícula (solicitado/entregado/pendiente —
 * student_enrollment_documents, 0020). */
export async function listEnrollmentDocuments(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_enrollment_documents")
    .select("*")
    .eq("student_id", studentId)
    .order("doc_type", { ascending: true });
  return data ?? [];
}

/** Certificados emitidos para un estudiante, reutilizando certificates —
 * misma RLS que el módulo Certificados (director/utp/administrativo/
 * superadmin). Para roles fuera de ese alcance (p. ej. inspectoria_general)
 * esta consulta simplemente devuelve vacío, sin ampliar nada. */
export async function listCertificatesForStudent(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, folio, cert_type, issued_at, status, verification_code")
    .eq("student_id", studentId)
    .order("issued_at", { ascending: false });
  return data ?? [];
}

export interface AttendanceSummary {
  total: number;
  presente: number;
  ausente: number;
  atraso: number;
  retiro: number;
  attendanceRate: number | null;
}

/** Resumen de asistencia calculado a partir de listAttendanceForStudent —
 * no es una consulta nueva, es una agregación de los mismos datos. */
export function summarizeAttendance(rows: { status: string }[]): AttendanceSummary {
  const total = rows.length;
  const presente = rows.filter((r) => r.status === "presente").length;
  const ausente = rows.filter((r) => r.status === "ausente").length;
  const atraso = rows.filter((r) => r.status === "atraso").length;
  const retiro = rows.filter((r) => r.status === "retiro").length;
  const attendanceRate = total > 0 ? Math.round(((presente + atraso) / total) * 100) : null;
  return { total, presente, ausente, atraso, retiro, attendanceRate };
}
