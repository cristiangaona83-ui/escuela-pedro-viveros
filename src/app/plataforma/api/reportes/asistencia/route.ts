import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { AttendanceReportDocument } from "@/lib/pdf/AttendanceReportDocument";
import { getAttendanceReport } from "@/services/attendance-report";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este reporte" }, { status: 403 });
  }

  const { course_id, date_from, date_to } = await request.json();
  if (!course_id || !date_from || !date_to) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const report = await getAttendanceReport(course_id, date_from, date_to);
  if (!report) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_reporte_asistencia",
    p_module: "reportes",
    p_entity: "attendance",
    p_details: { course_id, date_from, date_to, student_count: report.rows.length },
  });

  const buffer = await renderToBuffer(
    AttendanceReportDocument({
      courseLabel: report.courseLabel,
      dateFrom: date_from,
      dateTo: date_to,
      rows: report.rows,
      issuedAt: new Date().toISOString(),
      issuedBy: session.profile?.full_name ?? "—",
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="reporte-asistencia-${course_id}.pdf"`,
    },
  });
}
