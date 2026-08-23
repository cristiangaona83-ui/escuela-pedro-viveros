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

  const { student_id, period_id } = await request.json();
  if (!student_id || !period_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: period } = await supabase
    .from("academic_periods")
    .select("name, academic_year_id, academic_years(year)")
    .eq("id", period_id)
    .maybeSingle();
  if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

  const year = (period as unknown as { academic_years: { year: number } | null }).academic_years?.year ?? 0;
  const report = await getStudentSubjectAverages(student_id, period.academic_year_id, period_id);
  if (!report) return NextResponse.json({ error: "El estudiante no tiene matrícula en ese año" }, { status: 404 });

  const { data: folio, error: folioError } = await supabase.rpc("next_certificate_folio", {
    p_cert_type: "informe_semestral",
    p_year: year,
  });
  if (folioError || !folio) {
    console.error("[informes/semestral] next_certificate_folio error", {
      code: folioError?.code, message: folioError?.message, details: folioError?.details, hint: folioError?.hint,
    });
    return NextResponse.json({ error: "No se pudo generar el folio" }, { status: 500 });
  }

  const { data: certificate, error: insertError } = await supabase
    .from("certificates")
    .insert({
      folio,
      cert_type: "informe_semestral",
      student_id,
      academic_year_id: period.academic_year_id,
      issued_by: session.userId,
      payload: { period: period.name, generalAverage: report.generalAverage },
    })
    .select("*")
    .single();
  if (insertError || !certificate) {
    console.error("[informes/semestral] certificates insert error", {
      code: insertError?.code, message: insertError?.message, details: insertError?.details, hint: insertError?.hint,
      student_id, academic_year_id: period.academic_year_id, folio,
    });
    const friendly = insertError?.code === "23505" ? "Ya existe un informe con ese folio. Vuelve a intentarlo." : "No se pudo registrar el informe";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  const { error: auditError } = await supabase.rpc("log_audit", {
    p_action: "emitir_informe",
    p_module: "informes",
    p_entity: "certificates",
    p_entity_id: certificate.id,
    p_details: { folio, cert_type: "informe_semestral", student_id },
  });
  if (auditError) {
    console.error("[informes/semestral] log_audit error (informe ya registrado, no se interrumpe la emisión)", {
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
      title: "Informe de Calificaciones Semestral",
      subtitle: period.name,
      studentName: report.studentName,
      studentRun: report.studentRun,
      courseLabel: report.courseLabel,
      year,
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
        "Este informe resume el rendimiento académico del período indicado, según los registros de la plataforma pedagógica del establecimiento.",
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-semestral-${folio}.pdf"`,
    },
  });
}
