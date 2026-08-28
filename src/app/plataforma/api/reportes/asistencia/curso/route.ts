import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { AttendanceReportDocument } from "@/lib/pdf/AttendanceReportDocument";
import { getAttendanceReport, type AttendanceReportRow } from "@/services/attendance-report";
import { getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { computeRate, EMPTY_COUNTS } from "@/lib/attendance/calc";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const BROAD_ACCESS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

function toCsv(courseLabel: string, rangeLabel: string, rows: AttendanceReportRow[]) {
  const header = ["Estudiante", "RUN", "Presente", "Ausente", "Atraso", "Retiro", "% Asistencia"];
  const escape = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    `Reporte de Asistencia - ${courseLabel} - ${rangeLabel}`,
    header.map(escape).join(";"),
    ...rows.map((r) =>
      [r.studentName, r.studentRun, String(r.presente), String(r.ausente), String(r.atraso), String(r.retiro), r.attendanceRate !== null ? `${r.attendanceRate}%` : ""]
        .map(escape)
        .join(";")
    ),
  ];
  return "﻿" + lines.join("\r\n");
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este reporte" }, { status: 403 });
  }

  const { course_id, format, period, from, to } = await request.json();
  if (!course_id || (format !== "pdf" && format !== "csv")) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  if (!canWrite(session.roles, [...BROAD_ACCESS_ROLES])) {
    const teachable = await getTeachableCourses();
    if (!teachable.some((c) => c.course_id === course_id)) {
      return NextResponse.json({ error: "No tienes acceso a ese curso" }, { status: 403 });
    }
  }

  const { range } = await resolvePeriodFromSearchParams({ period, from, to });
  const [report, thresholds] = await Promise.all([getAttendanceReport(course_id, range.from, range.to), getAttendanceThresholds()]);
  if (!report) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("profiles!courses_homeroom_teacher_id_fkey(full_name)")
    .eq("id", course_id)
    .maybeSingle();
  const teacherName = (course?.profiles as unknown as { full_name: string } | null)?.full_name ?? null;

  const totalCounts = report.rows.reduce(
    (acc, r) => ({ presente: acc.presente + r.presente, ausente: acc.ausente + r.ausente, atraso: acc.atraso + r.atraso, retiro: acc.retiro + r.retiro }),
    EMPTY_COUNTS
  );
  const generalRate = computeRate(totalCounts);

  await supabase.rpc("log_audit", {
    p_action: `generar_reporte_asistencia_curso_${format}`,
    p_module: "reportes",
    p_entity: "attendance",
    p_details: { course_id, period: range.label, date_from: range.from, date_to: range.to, student_count: report.rows.length },
  });

  if (format === "csv") {
    return new NextResponse(toCsv(report.courseLabel, range.label, report.rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="asistencia-${course_id}.csv"` },
    });
  }

  const buffer = await renderToBuffer(
    AttendanceReportDocument({
      courseLabel: report.courseLabel,
      teacherName,
      matricula: report.rows.length,
      generalRate,
      dateFrom: range.from,
      dateTo: range.to,
      rows: report.rows,
      issuedAt: new Date().toISOString(),
      issuedBy: session.profile?.full_name ?? "—",
      thresholds,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="asistencia-${course_id}.pdf"` },
  });
}
