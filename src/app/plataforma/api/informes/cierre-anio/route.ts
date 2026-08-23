import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { GradesReportDocument } from "@/lib/pdf/GradesReportDocument";
import { getStudentSubjectAverages } from "@/services/report-data";
import { getHomeroomTeacherName } from "@/services/students";
import { listStudentGuardiansFull } from "@/services/guardians";
import { DEFAULT_GRADING_CONFIG } from "@/config/grading";
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
  if (folioError || !folio) {
    console.error("[informes/cierre-anio] next_certificate_folio error", {
      code: folioError?.code, message: folioError?.message, details: folioError?.details, hint: folioError?.hint,
    });
    return NextResponse.json({ error: "No se pudo generar el folio" }, { status: 500 });
  }

  const { data: certificate, error: insertError } = await supabase
    .from("certificates")
    .insert({
      folio,
      cert_type: "cierre_anio",
      student_id,
      academic_year_id,
      issued_by: session.userId,
      payload: { generalAverage: report.generalAverage, situation },
    })
    .select("*")
    .single();
  if (insertError || !certificate) {
    console.error("[informes/cierre-anio] certificates insert error", {
      code: insertError?.code, message: insertError?.message, details: insertError?.details, hint: insertError?.hint,
      student_id, academic_year_id, folio,
    });
    const friendly = insertError?.code === "23505" ? "Ya existe un informe con ese folio. Vuelve a intentarlo." : "No se pudo registrar el informe";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  const { error: auditError } = await supabase.rpc("log_audit", {
    p_action: "emitir_informe",
    p_module: "informes",
    p_entity: "certificates",
    p_entity_id: certificate.id,
    p_details: { folio, cert_type: "cierre_anio", student_id },
  });
  if (auditError) {
    console.error("[informes/cierre-anio] log_audit error (informe ya registrado, no se interrumpe la emisión)", {
      code: auditError.code, message: auditError.message,
    });
  }

  const [homeroomTeacher, guardians] = await Promise.all([
    getHomeroomTeacherName(report.courseId),
    listStudentGuardiansFull(student_id),
  ]);
  const primaryGuardian = guardians.find((g) => g.isPrimary) ?? guardians[0] ?? null;

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
      signatures: [
        { name: homeroomTeacher ?? "—", title: "Profesor(a) Jefe" },
        { name: SITE.director, title: "Director" },
      ],
      guardianName: primaryGuardian?.guardian.full_name ?? null,
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
