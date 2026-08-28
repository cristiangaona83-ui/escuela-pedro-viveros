import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { SchoolAttendanceReportDocument } from "@/lib/pdf/SchoolAttendanceReportDocument";
import { getSchoolAttendanceOverview, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;

function toCsv(overview: Awaited<ReturnType<typeof getSchoolAttendanceOverview>>) {
  const header = ["Curso", "Matrícula", "Presente", "Ausente", "Atraso", "Retiro", "% Asistencia", "% Inasistencia", "Bajo umbral", "Estado"];
  const escape = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = overview.courses.map((c) => [
    c.courseLabel,
    String(c.matricula),
    String(c.counts.presente),
    String(c.counts.ausente),
    String(c.counts.atraso),
    String(c.counts.retiro),
    c.rate !== null ? `${c.rate}%` : "",
    c.rate !== null ? `${Math.round((100 - c.rate) * 10) / 10}%` : "",
    String(c.belowYellow),
    c.semaforo,
  ]);
  const lines = [
    `Panorama de Asistencia - ${overview.range.label} (${overview.range.from} a ${overview.range.to})`,
    header.map(escape).join(";"),
    ...rows.map((r) => r.map(escape).join(";")),
  ];
  return "﻿" + lines.join("\r\n");
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este reporte" }, { status: 403 });
  }

  const { format, period, from, to } = await request.json();
  if (format !== "pdf" && format !== "csv") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const { range } = await resolvePeriodFromSearchParams({ period, from, to });
  const [courses, thresholds] = await Promise.all([getTeachableCourses(), getAttendanceThresholds()]);
  const courseIds = courses.map((c) => c.course_id);
  const overview = await getSchoolAttendanceOverview(courseIds, range, thresholds);

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: `generar_panorama_asistencia_${format}`,
    p_module: "reportes",
    p_entity: "attendance",
    p_details: { period: range.label, date_from: range.from, date_to: range.to, course_count: courseIds.length },
  });

  if (format === "csv") {
    return new NextResponse(toCsv(overview), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="panorama-asistencia.csv"` },
    });
  }

  const buffer = await renderToBuffer(
    SchoolAttendanceReportDocument({ overview, issuedAt: new Date().toISOString(), issuedBy: session.profile?.full_name ?? "—" })
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="panorama-asistencia.pdf"` },
  });
}
