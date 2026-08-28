import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { StudentAttendanceReportDocument } from "@/lib/pdf/StudentAttendanceReportDocument";
import { getStudentAttendanceDetail, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

// Reporte individual: privado. Mismos roles que el reporte de curso, más el
// mismo control de alcance por curso para docente (nunca por el solo hecho
// de tener el rol, siempre verificando que el estudiante esté en un curso
// que ese docente efectivamente puede ver).
const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const BROAD_ACCESS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este reporte" }, { status: 403 });
  }

  const { student_id, period, from, to } = await request.json();
  if (!student_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { range } = await resolvePeriodFromSearchParams({ period, from, to });
  const thresholds = await getAttendanceThresholds();
  const detail = await getStudentAttendanceDetail(student_id, range, thresholds);
  if (!detail) return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });

  if (!canWrite(session.roles, [...BROAD_ACCESS_ROLES])) {
    const teachable = await getTeachableCourses();
    if (!detail.courseId || !teachable.some((c) => c.course_id === detail.courseId)) {
      return NextResponse.json({ error: "No tienes acceso a este estudiante" }, { status: 403 });
    }
  }

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_reporte_asistencia_estudiante",
    p_module: "reportes",
    p_entity: "attendance",
    p_entity_id: student_id,
    p_details: { period: range.label, date_from: range.from, date_to: range.to },
  });

  const buffer = await renderToBuffer(
    StudentAttendanceReportDocument({ detail, rangeLabel: `${range.label}`, issuedAt: new Date().toISOString(), issuedBy: session.profile?.full_name ?? "—" })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="asistencia-estudiante-${student_id}.pdf"` },
  });
}
