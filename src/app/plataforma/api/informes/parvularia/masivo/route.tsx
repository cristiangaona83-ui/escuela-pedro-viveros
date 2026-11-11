import { NextResponse } from "next/server";
import { renderToBuffer, Document } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ParvulariaReportPage } from "@/lib/pdf/ParvulariaReportDocument";
import { getParvulariaReportContext } from "@/lib/pdf/parvularia-context";
import { getParvulariaCourseReports } from "@/services/parvularia";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "docente", "superadmin"] as const;
const BROAD_ROLES = ["director", "utp", "administrativo", "superadmin"];

/**
 * Impresión masiva: el informe de todos los niños(as) del curso en un solo
 * PDF (una hoja -- o más, si el informe pasa de una página -- por niño(a),
 * con exactamente el mismo componente que la emisión individual).
 * GET ?course_id=...&year=<academic_year_id>.
 */
export async function GET(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir estos informes" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");
  const yearId = searchParams.get("year");
  if (!courseId || !yearId) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  if (!session.roles.some((r) => BROAD_ROLES.includes(r))) {
    const teachable = await getTeachableCourses(yearId);
    if (!teachable.some((c) => c.course_id === courseId)) {
      return NextResponse.json({ error: "No enseñas en este curso" }, { status: 403 });
    }
  }

  const reports = await getParvulariaCourseReports(courseId, yearId);
  if (reports.length === 0) {
    return NextResponse.json({ error: "El curso no tiene niños(as) con matrícula activa, o no es Prekínder/Kínder" }, { status: 404 });
  }

  const context = await getParvulariaReportContext(courseId);
  const buffer = await renderToBuffer(
    <Document title={`Informes Pedagógicos ${reports[0].courseLabel}`}>
      {reports.map((report) => (
        <ParvulariaReportPage key={report.studentId} report={report} context={context} />
      ))}
    </Document>
  );

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "emitir_informe_parvularia_masivo",
    p_module: "informes",
    p_entity: "courses",
    p_entity_id: courseId,
    p_details: { course: reports[0].courseLabel, year: reports[0].year, students: reports.length },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informes-pedagogicos-${slugify(reports[0].courseLabel)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
