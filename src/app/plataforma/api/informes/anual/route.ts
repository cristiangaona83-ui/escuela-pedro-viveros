import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CertificadoAnualEstudiosDocument } from "@/lib/pdf/CertificadoAnualEstudiosDocument";
import { formalCourseName, nextFormalCourseName, isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { getStudentSubjectAverages } from "@/services/report-data";
import { getHomeroomTeacherName } from "@/services/students";
import { getStudentAttendanceRate } from "@/services/student-attendance";
import { getDirectorSignatureDataUri } from "@/lib/pdf/director-signature";
import { DEFAULT_GRADING_CONFIG } from "@/config/grading";
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

  const { student_id, academic_year_id } = await request.json();
  if (!student_id || !academic_year_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: year } = await supabase.from("academic_years").select("year").eq("id", academic_year_id).maybeSingle();
  if (!year) return NextResponse.json({ error: "Año no encontrado" }, { status: 404 });

  const report = await getStudentSubjectAverages(student_id, academic_year_id);
  if (!report) return NextResponse.json({ error: "El estudiante no tiene matrícula en ese año" }, { status: 404 });
  if (!isEnsenanzaBasica(report.courseLevel)) {
    return NextResponse.json({ error: "El Certificado Anual de Estudios aplica solo a cursos de Enseñanza Básica (1° a 8° Básico)" }, { status: 400 });
  }

  const { data: folio, error: folioError } = await supabase.rpc("next_certificate_folio", {
    p_cert_type: "informe_anual",
    p_year: year.year,
  });
  if (folioError || !folio) {
    console.error("[informes/anual] next_certificate_folio error", {
      code: folioError?.code, message: folioError?.message, details: folioError?.details, hint: folioError?.hint,
    });
    return NextResponse.json({ error: "No se pudo generar el folio" }, { status: 500 });
  }

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
  if (insertError || !certificate) {
    console.error("[informes/anual] certificates insert error", {
      code: insertError?.code, message: insertError?.message, details: insertError?.details, hint: insertError?.hint,
      student_id, academic_year_id, folio,
    });
    const friendly = insertError?.code === "23505" ? "Ya existe un certificado con ese folio. Vuelve a intentarlo." : "No se pudo registrar el certificado";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  const { error: auditError } = await supabase.rpc("log_audit", {
    p_action: "emitir_informe",
    p_module: "informes",
    p_entity: "certificates",
    p_entity_id: certificate.id,
    p_details: { folio, cert_type: "informe_anual", student_id },
  });
  if (auditError) {
    console.error("[informes/anual] log_audit error (certificado ya registrado, no se interrumpe la emisión)", {
      code: auditError.code, message: auditError.message,
    });
  }

  const [homeroomTeacher, attendanceRate, directorSignatureDataUri] = await Promise.all([
    getHomeroomTeacherName(report.courseId),
    getStudentAttendanceRate(student_id, report.courseId, `${year.year}-01-01`, `${year.year}-12-31`),
    getDirectorSignatureDataUri(),
  ]);

  const courseFormalName = formalCourseName(report.courseLevel, report.courseLetter);
  const promoted = report.generalAverage !== null && report.generalAverage >= DEFAULT_GRADING_CONFIG.approvalMinimum;
  const promotionSentence =
    report.generalAverage === null
      ? "La situación final no puede determinarse por falta de calificaciones registradas."
      : promoted
        ? (() => {
            const next = nextFormalCourseName(report.courseLevel);
            return `En consecuencia, corresponde su promoción a ${next ?? "el nivel siguiente"}${next ? "" : ", concluyendo la Enseñanza Básica en el establecimiento"}.`;
          })()
        : `En consecuencia, no corresponde su promoción, permaneciendo en ${courseFormalName}.`;

  const buffer = await renderToBuffer(
    CertificadoAnualEstudiosDocument({
      folio,
      studentName: report.studentName,
      studentRun: report.studentRun,
      courseFormalName,
      year: year.year,
      rows: report.rows,
      generalAverage: report.generalAverage,
      attendanceRate,
      promotionSentence,
      homeroomTeacherName: homeroomTeacher,
      issuedAt: certificate.issued_at,
      verificationCode: certificate.verification_code,
      directorSignatureDataUri,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-anual-estudios-${folio}.pdf"`,
    },
  });
}
