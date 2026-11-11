import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ParvulariaReportDocument } from "@/lib/pdf/ParvulariaReportDocument";
import { getParvulariaReportContext } from "@/lib/pdf/parvularia-context";
import { getParvulariaStudentReport } from "@/services/parvularia";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

/** Dirección/UTP/Administrativo ven todos los cursos; el personal docente, solo los que enseña (teaches_course, igual que RLS). */
const ALLOWED_ROLES = ["director", "utp", "administrativo", "docente", "superadmin"] as const;
const BROAD_ROLES = ["director", "utp", "administrativo", "superadmin"];

/**
 * Informe Pedagógico de Educación Parvularia de un niño(a): GET con
 * ?student_id=...&year=<academic_year_id> -- se abre en una pestaña nueva
 * desde la nómina del curso. No emite folio ni inserta en `certificates`:
 * es un informe a la familia que se puede volver a generar cuantas veces
 * haga falta con lo que esté registrado en ese momento.
 */
export async function GET(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir este informe" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");
  const yearId = searchParams.get("year");
  if (!studentId || !yearId) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const report = await getParvulariaStudentReport(studentId, yearId);
  if (!report) return NextResponse.json({ error: "El niño(a) no tiene matrícula activa en Prekínder o Kínder ese año" }, { status: 404 });

  if (!session.roles.some((r) => BROAD_ROLES.includes(r))) {
    const teachable = await getTeachableCourses(yearId);
    if (!teachable.some((c) => c.course_id === report.courseId)) {
      return NextResponse.json({ error: "No enseñas en el curso de este niño(a)" }, { status: 403 });
    }
  }

  const context = await getParvulariaReportContext(report.courseId);
  const buffer = await renderToBuffer(ParvulariaReportDocument({ report, context }));

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "emitir_informe_parvularia",
    p_module: "informes",
    p_entity: "parvularia_evaluations",
    p_entity_id: studentId,
    p_details: { course: report.courseLabel, year: report.year },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-pedagogico-${slugify(report.courseLabel)}-${slugify(report.studentName)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
