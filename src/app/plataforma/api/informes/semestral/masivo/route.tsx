import { NextResponse } from "next/server";
import { renderToBuffer, Document } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CertificadoSemestralEstudiosPage } from "@/lib/pdf/CertificadoSemestralEstudiosDocument";
import { formalCourseName, isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { getCourseSubjectAverages } from "@/services/report-data";
import { getHomeroomTeacherName } from "@/services/students";
import { getCourseAttendanceRates } from "@/services/student-attendance";
import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { getInstitutionalProfile } from "@/services/school-config";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

/**
 * Impresión masiva del Informe Semestral de un curso completo -- un único
 * PDF con una página por estudiante (CertificadoSemestralEstudiosPage,
 * exactamente el mismo componente que usa la emisión individual), cada
 * estudiante en su propia página de react-pdf (salto de página nativo, sin
 * CSS de impresión). A propósito NO inserta filas en `certificates`: no
 * mintea folio por estudiante (ver comentario de `folio` más abajo) -- solo
 * recupera datos ya existentes y los renderiza juntos, sin duplicar
 * emisiones individuales ya hechas ni generar de más.
 */
export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir estos informes" }, { status: 403 });
  }
  const supabase = await createClient();

  const { course_id, period_id } = await request.json();
  if (!course_id || !period_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data: period } = await supabase
    .from("academic_periods")
    .select("name, academic_year_id, start_date, end_date, academic_years(year)")
    .eq("id", period_id)
    .maybeSingle();
  if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
  const year = (period as unknown as { academic_years: { year: number } | null }).academic_years?.year ?? 0;

  const { data: course } = await supabase.from("courses").select("level, letter").eq("id", course_id).maybeSingle();
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  if (!isEnsenanzaBasica(course.level)) {
    return NextResponse.json({ error: "El Informe Semestral aplica solo a cursos de Enseñanza Básica (1° a 8° Básico)" }, { status: 400 });
  }

  const reports = await getCourseSubjectAverages(course_id, period.academic_year_id, period_id);
  const available = reports.filter((r) => r.generalAverage !== null);
  if (available.length === 0) {
    return NextResponse.json({ error: "Ningún estudiante de este curso tiene el informe completo todavía." }, { status: 400 });
  }

  const dateFrom = period.start_date ?? `${year}-01-01`;
  const dateTo = period.end_date ?? `${year}-12-31`;
  const [homeroomTeacher, attendanceRates, directorSignatureDataUri, stampDataUri, profile] = await Promise.all([
    getHomeroomTeacherName(course_id),
    getCourseAttendanceRates(course_id, dateFrom, dateTo),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
    getInstitutionalProfile(),
  ]);

  const courseFormalName = formalCourseName(course.level, course.letter);
  const issuedAt = new Date().toISOString();

  const buffer = await renderToBuffer(
    <Document title={`Informes Semestrales - ${course.level} ${course.letter}`}>
      {available.map((report) => (
        <CertificadoSemestralEstudiosPage
          key={report.studentId}
          // Impresión masiva: no se emite folio ni código de verificación
          // individual (ver comentario del archivo) -- estos campos quedan
          // honestos en vez de inventar un folio no registrado.
          folio="—"
          studentName={report.studentName}
          studentRun={report.studentRun}
          courseFormalName={courseFormalName}
          periodName={period.name}
          year={year}
          rows={report.rows}
          generalAverage={report.generalAverage}
          attendanceRate={attendanceRates.get(report.studentId) ?? null}
          homeroomTeacherName={homeroomTeacher}
          issuedAt={issuedAt}
          verificationCode="Impresión masiva — no constituye emisión oficial individual"
          directorSignatureDataUri={directorSignatureDataUri}
          stampDataUri={stampDataUri}
          profile={profile}
        />
      ))}
    </Document>
  );

  await supabase.rpc("log_audit", {
    p_action: "imprimir_informes_curso",
    p_module: "informes",
    p_entity: "courses",
    p_entity_id: course_id,
    p_details: { cert_type: "informe_semestral", period_id, student_count: available.length, pending_count: reports.length - available.length },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informes-semestrales-${course.level}-${course.letter}.pdf"`,
    },
  });
}
