import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { GradesReportDocument } from "@/lib/pdf/GradesReportDocument";
import { getStudentSubjectAverages } from "@/services/report-data";
import { getCertificateSignature } from "@/services/school-config";
import { DEFAULT_GRADING_CONFIG } from "@/config/grading";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { student_id, academic_year_id } = await request.json();
  if (!student_id || !academic_year_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: year } = await supabase.from("academic_years").select("year").eq("id", academic_year_id).maybeSingle();
  if (!year) return NextResponse.json({ error: "Año no encontrado" }, { status: 404 });

  const report = await getStudentSubjectAverages(student_id, academic_year_id);
  if (!report) return NextResponse.json({ error: "El estudiante no tiene matrícula en ese año" }, { status: 404 });

  const situation =
    report.generalAverage !== null && report.generalAverage >= DEFAULT_GRADING_CONFIG.approvalMinimum
      ? "Promovido(a)"
      : report.generalAverage !== null
        ? "Con observación académica"
        : "Sin información suficiente";

  const { data: folio, error: folioError } = await supabase.rpc("next_certificate_folio", {
    p_cert_type: "cierre_anio",
    p_year: year.year,
  });
  if (folioError || !folio) return NextResponse.json({ error: "No se pudo generar el folio" }, { status: 500 });

  const { data: certificate, error: insertError } = await supabase
    .from("certificates")
    .insert({
      folio,
      cert_type: "cierre_anio",
      student_id,
      academic_year_id,
      issued_by: user.id,
      payload: { generalAverage: report.generalAverage, situation },
    })
    .select("*")
    .single();
  if (insertError || !certificate) return NextResponse.json({ error: "No se pudo registrar el informe" }, { status: 500 });

  await supabase.rpc("log_audit", {
    p_action: "emitir_informe",
    p_module: "informes",
    p_entity: "certificates",
    p_entity_id: certificate.id,
    p_details: { folio, cert_type: "cierre_anio", student_id },
  });

  const signature = await getCertificateSignature();

  const buffer = await renderToBuffer(
    GradesReportDocument({
      folio,
      title: "Informe de Cierre de Año",
      subtitle: `Año académico ${year.year} · Situación final: ${situation}`,
      studentName: report.studentName,
      studentRun: report.studentRun,
      courseLabel: report.courseLabel,
      year: year.year,
      issuedAt: certificate.issued_at,
      rows: report.rows,
      generalAverage: report.generalAverage,
      signatureName: signature.name,
      signatureTitle: signature.title,
      disclaimer:
        "Informe de Cierre de Año / Informe Anual del Establecimiento. Este documento NO reemplaza el Certificado Anual de Estudios oficial emitido por el MINEDUC.",
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cierre-anio-${folio}.pdf"`,
    },
  });
}
