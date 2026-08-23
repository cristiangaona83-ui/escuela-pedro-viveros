import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { GradesReportDocument } from "@/lib/pdf/GradesReportDocument";
import { getStudentSubjectAverages } from "@/services/report-data";
import { getHomeroomTeacherName } from "@/services/students";
import { listStudentGuardiansFull } from "@/services/guardians";
import { SITE } from "@/config/site";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir este informe" }, { status: 403 });
  }
  const supabase = await createClient();

  const { student_id, academic_year_id } = await request.json();
  if (!student_id || !academic_year_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: year } = await supabase.from("academic_years").select("year").eq("id", academic_year_id).maybeSingle();
  if (!year) return NextResponse.json({ error: "Año no encontrado" }, { status: 404 });

  const report = await getStudentSubjectAverages(student_id, academic_year_id);
  if (!report) return NextResponse.json({ error: "El estudiante no tiene matrícula en ese año" }, { status: 404 });

  const { data: folio, error: folioError } = await supabase.rpc("next_certificate_folio", {
    p_cert_type: "informe_anual",
    p_year: year.year,
  });
  if (folioError || !folio) return NextResponse.json({ error: "No se pudo generar el folio" }, { status: 500 });

  const { data: certificate, error: insertError } = await supabase
    .from("certificates")
    .insert({
      folio,
      cert_type: "informe_anual",
      student_id,
      academic_year_id,
      issued_by: session.userId,
      payload: { generalAverage: report.generalAverage },
    })
    .select("*")
    .single();
  if (insertError || !certificate) return NextResponse.json({ error: "No se pudo registrar el informe" }, { status: 500 });

  await supabase.rpc("log_audit", {
    p_action: "emitir_informe",
    p_module: "informes",
    p_entity: "certificates",
    p_entity_id: certificate.id,
    p_details: { folio, cert_type: "informe_anual", student_id },
  });

  const [homeroomTeacher, guardians] = await Promise.all([
    getHomeroomTeacherName(report.courseId),
    listStudentGuardiansFull(student_id),
  ]);
  const primaryGuardian = guardians.find((g) => g.isPrimary) ?? guardians[0] ?? null;

  const buffer = await renderToBuffer(
    GradesReportDocument({
      folio,
      title: "Informe Anual de Calificaciones",
      subtitle: `Año académico ${year.year}`,
      studentName: report.studentName,
      studentRun: report.studentRun,
      courseLabel: report.courseLabel,
      year: year.year,
      issuedAt: certificate.issued_at,
      rows: report.rows,
      generalAverage: report.generalAverage,
      signatures: [
        { name: homeroomTeacher ?? "—", title: "Profesor(a) Jefe" },
        { name: SITE.utpName, title: "Jefa de UTP" },
        { name: SITE.director, title: "Director" },
      ],
      guardianName: primaryGuardian?.guardian.full_name ?? null,
      disclaimer:
        "Este informe resume los resultados finales del año académico, según los registros de la plataforma pedagógica del establecimiento.",
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-anual-${folio}.pdf"`,
    },
  });
}
