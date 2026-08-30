import { createClient } from "@/lib/supabase/server";

/**
 * Porcentaje de asistencia de un estudiante en un rango de fechas, para un
 * curso determinado. Mismo criterio que getAttendanceReport()
 * (services/attendance-report.ts): presente + atraso cuentan como
 * asistido; ausente y retiro no. Devuelve null si no hay registros en el
 * rango (no confundir con 0%).
 */
export async function getStudentAttendanceRate(
  studentId: string,
  courseId: string,
  dateFrom: string,
  dateTo: string
): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .gte("date", dateFrom)
    .lte("date", dateTo);

  if (!data || data.length === 0) return null;
  const attended = data.filter((r) => r.status === "presente" || r.status === "atraso").length;
  return Math.round((attended / data.length) * 1000) / 10;
}

/**
 * Igual criterio que getStudentAttendanceRate, pero para todo un curso en
 * una sola consulta (no una por estudiante) -- para la impresión masiva de
 * Informes, donde se necesita el % de asistencia de cada estudiante del
 * curso a la vez.
 */
export async function getCourseAttendanceRates(courseId: string, dateFrom: string, dateTo: string): Promise<Map<string, number | null>> {
  const supabase = await createClient();
  const { data } = await supabase.from("attendance").select("student_id, status").eq("course_id", courseId).gte("date", dateFrom).lte("date", dateTo);

  const byStudent = new Map<string, { total: number; attended: number }>();
  for (const r of data ?? []) {
    const entry = byStudent.get(r.student_id) ?? { total: 0, attended: 0 };
    entry.total += 1;
    if (r.status === "presente" || r.status === "atraso") entry.attended += 1;
    byStudent.set(r.student_id, entry);
  }

  const rates = new Map<string, number | null>();
  for (const [studentId, { total, attended }] of byStudent) {
    rates.set(studentId, total === 0 ? null : Math.round((attended / total) * 1000) / 10);
  }
  return rates;
}
