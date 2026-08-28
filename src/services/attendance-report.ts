import { createClient } from "@/lib/supabase/server";
import { getExcludedDatesByCourse } from "@/services/class-suspensions";

export interface AttendanceReportRow {
  studentName: string;
  studentRun: string;
  presente: number;
  ausente: number;
  atraso: number;
  retiro: number;
  total: number;
  attendanceRate: number | null;
}

export interface AttendanceReportData {
  courseLabel: string;
  rows: AttendanceReportRow[];
}

/**
 * Asistencia = presente + atraso sobre el total de días con registro (retiro y
 * ausente no cuentan como asistido), criterio habitual en establecimientos.
 */
export async function getAttendanceReport(
  courseId: string,
  dateFrom: string,
  dateTo: string
): Promise<AttendanceReportData | null> {
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("level, letter").eq("id", courseId).maybeSingle();
  if (!course) return null;

  const [{ data: attendance }, excludedByCourse] = await Promise.all([
    supabase
      .from("attendance")
      .select("date, student_id, status, students(first_names, last_names, run)")
      .eq("course_id", courseId)
      .gte("date", dateFrom)
      .lte("date", dateTo),
    getExcludedDatesByCourse([courseId], dateFrom, dateTo),
  ]);
  const excludedDates = excludedByCourse.get(courseId);

  const byStudent = new Map<
    string,
    { name: string; run: string; counts: Record<"presente" | "ausente" | "atraso" | "retiro", number> }
  >();

  for (const row of attendance ?? []) {
    const r = row as unknown as {
      date: string;
      student_id: string;
      status: "presente" | "ausente" | "atraso" | "retiro";
      students: { first_names: string; last_names: string; run: string } | null;
    };
    if (!r.students) continue;
    // Excluye fechas con suspensión institucional de jornada completa del
    // denominador -- nunca borra ni edita la fila de attendance, solo la
    // deja fuera de este conteo (class-suspensions.ts).
    if (excludedDates?.has(r.date)) continue;
    const entry = byStudent.get(r.student_id) ?? {
      name: `${r.students.last_names}, ${r.students.first_names}`,
      run: r.students.run,
      counts: { presente: 0, ausente: 0, atraso: 0, retiro: 0 },
    };
    entry.counts[r.status] += 1;
    byStudent.set(r.student_id, entry);
  }

  const rows: AttendanceReportRow[] = Array.from(byStudent.values())
    .map((v) => {
      const total = v.counts.presente + v.counts.ausente + v.counts.atraso + v.counts.retiro;
      const attended = v.counts.presente + v.counts.atraso;
      return {
        studentName: v.name,
        studentRun: v.run,
        presente: v.counts.presente,
        ausente: v.counts.ausente,
        atraso: v.counts.atraso,
        retiro: v.counts.retiro,
        total,
        attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return { courseLabel: `${course.level} ${course.letter}`, rows };
}
