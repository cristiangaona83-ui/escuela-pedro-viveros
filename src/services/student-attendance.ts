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
