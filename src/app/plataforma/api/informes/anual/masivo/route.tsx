import { NextResponse } from "next/server";
import { renderToBuffer, Document } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CertificadoAnualEstudiosPage } from "@/lib/pdf/CertificadoAnualEstudiosDocument";
import { formalCourseName, nextFormalCourseName, isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { getCourseSubjectAverages } from "@/services/report-data";
import { getHomeroomTeacherName } from "@/services/students";
import { getCourseAttendanceRates } from "@/services/student-attendance";
import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { getInstitutionalProfile } from "@/services/school-config";
import { DEFAULT_GRADING_CONFIG } from "@/config/grading";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

/** Impresión masiva del Informe Anual de un curso completo -- ver comentario equivalente en informes/semestral/masivo/route.tsx (mismo criterio: un solo <Document>, sin folio individual, sin insertar en `certificates`). */
export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir estos informes" }, { status: 403 });
  }
  const supabase = await createClient();

  const { course_id, academic_year_id } = await request.json();
  if (!course_id || !academic_year_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: year } = await supabase.from("academic_years").select("year").eq("id", academic_year_id).maybeSingle();
  if (!year) return NextResponse.json({ error: "Año no encontrado" }, { status: 404 });

  const { data: course } = await supabase.from("courses").select("level, letter").eq("id", course_id).maybeSingle();
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  if (!isEnsenanzaBasica(course.level)) {
    return NextResponse.json({ error: "El Informe Anual aplica solo a cursos de Enseñanza Básica (1° a 8° Básico)" }, { status: 400 });
  }

  const reports = await getCourseSubjectAverages(course_id, academic_year_id);
  const available = reports.filter((r) => r.generalAverage !== null);
  if (available.length === 0) {
    return NextResponse.json({ error: "Ningún estudiante de este curso tiene el informe completo todavía." }, { status: 400 });
  }

  const [homeroomTeacher, attendanceRates, directorSignatureDataUri, stampDataUri, profile] = await Promise.all([
    getHomeroomTeacherName(course_id),
    getCourseAttendanceRates(course_id, `${year.year}-01-01`, `${year.year}-12-31`),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
    getInstitutionalProfile(),
  ]);

  const courseFormalName = formalCourseName(course.level, course.letter);
  const issuedAt = new Date().toISOString();

  const buffer = await renderToBuffer(
    <Document title={`Informes Anuales - ${course.level} ${course.letter}`}>
      {available.map((report) => {
        const promoted = report.generalAverage !== null && report.generalAverage >= DEFAULT_GRADING_CONFIG.approvalMinimum;
        const promotionSentence = promoted
          ? (() => {
              const next = nextFormalCourseName(report.courseLevel);
              return `En consecuencia, corresponde su promoción a ${next ?? "el nivel siguiente"}${next ? "" : ", concluyendo la Enseñanza Básica en el establecimiento"}.`;
            })()
          : `En consecuencia, no corresponde su promoción, permaneciendo en ${courseFormalName}.`;

        return (
          <CertificadoAnualEstudiosPage
            key={report.studentId}
            folio="—"
            studentName={report.studentName}
            studentRun={report.studentRun}
            courseFormalName={courseFormalName}
            year={year.year}
            rows={report.rows}
            generalAverage={report.generalAverage}
            attendanceRate={attendanceRates.get(report.studentId) ?? null}
            promotionSentence={promotionSentence}
            homeroomTeacherName={homeroomTeacher}
            issuedAt={issuedAt}
            verificationCode="Impresión masiva — no constituye emisión oficial individual"
            directorSignatureDataUri={directorSignatureDataUri}
            stampDataUri={stampDataUri}
            profile={profile}
          />
        );
      })}
    </Document>
  );

  await supabase.rpc("log_audit", {
    p_action: "imprimir_informes_curso",
    p_module: "informes",
    p_entity: "courses",
    p_entity_id: course_id,
    p_details: { cert_type: "informe_anual", academic_year_id, student_count: available.length, pending_count: reports.length - available.length },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informes-anuales-${course.level}-${course.letter}.pdf"`,
    },
  });
}
