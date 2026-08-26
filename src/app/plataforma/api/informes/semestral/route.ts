import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CertificadoSemestralEstudiosDocument } from "@/lib/pdf/CertificadoSemestralEstudiosDocument";
import { formalCourseName, isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { getStudentSubjectAverages } from "@/services/report-data";
import { getHomeroomTeacherName } from "@/services/students";
import { getStudentAttendanceRate } from "@/services/student-attendance";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir este certificado" }, { status: 403 });
  }
  const supabase = await createClient();

  const { student_id, period_id } = await request.json();
  if (!student_id || !period_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: period } = await supabase
    .from("academic_periods")
    .select("name, academic_year_id, start_date, end_date, academic_years(year)")
    .eq("id", period_id)
    .maybeSingle();
  if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

  const year = (period as unknown as { academic_years: { year: number } | null }).academic_years?.year ?? 0;
  const report = await getStudentSubjectAverages(student_id, period.academic_year_id, period_id);
  if (!report) return NextResponse.json({ error: "El estudiante no tiene matrícula en ese año" }, { status: 404 });
  if (!isEnsenanzaBasica(report.courseLevel)) {
    return NextResponse.json({ error: "El Certificado Semestral de Estudios aplica solo a cursos de Enseñanza Básica (1° a 8° Básico)" }, { status: 400 });
  }

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
    const friendly = insertError?.code === "23505" ? "Ya existe un certificado con ese folio. Vuelve a intentarlo." : "No se pudo registrar el certificado";
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
    console.error("[informes/semestral] log_audit error (certificado ya registrado, no se interrumpe la emisión)", {
      code: auditError.code, message: auditError.message,
    });
  }

  // Rango de asistencia: fechas reales del período si están definidas, si no todo el año calendario.
  const dateFrom = period.start_date ?? `${year}-01-01`;
  const dateTo = period.end_date ?? `${year}-12-31`;
  const [homeroomTeacher, attendanceRate] = await Promise.all([
    getHomeroomTeacherName(report.courseId),
    getStudentAttendanceRate(student_id, report.courseId, dateFrom, dateTo),
  ]);

  const buffer = await renderToBuffer(
    CertificadoSemestralEstudiosDocument({
      folio,
      studentName: report.studentName,
      studentRun: report.studentRun,
      courseFormalName: formalCourseName(report.courseLevel, report.courseLetter),
      periodName: period.name,
      year,
      rows: report.rows,
      generalAverage: report.generalAverage,
      attendanceRate,
      homeroomTeacherName: homeroomTeacher,
      issuedAt: certificate.issued_at,
      verificationCode: certificate.verification_code,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-semestral-estudios-${folio}.pdf"`,
    },
  });
}
