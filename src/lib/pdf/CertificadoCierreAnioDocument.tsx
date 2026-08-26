import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { CertificateInstitutionalHeader, GradesWordsTable, CertificateSignatureFooter, compactParagraph, compactHeading } from "./OfficialCertificateShared";
import { formatRun } from "@/lib/utils";
import type { SubjectAverageRow } from "./OfficialCertificateShared";
import type { InstitutionalProfile } from "@/services/school-config";

export function CertificadoCierreAnioDocument({
  folio,
  studentName,
  studentRun,
  courseFormalName,
  nextCourseFormalName,
  year,
  rows,
  generalAverage,
  attendanceRate,
  promoted,
  homeroomTeacherName,
  issuedAt,
  verificationCode,
  directorSignatureDataUri,
  profile,
}: {
  folio: string;
  studentName: string;
  studentRun: string;
  courseFormalName: string;
  /** Nombre formal del curso siguiente, o null si no aplica (no promovida, u 8° Básico que concluye la Enseñanza Básica). */
  nextCourseFormalName: string | null;
  year: number;
  rows: SubjectAverageRow[];
  generalAverage: number | null;
  attendanceRate: number | null;
  promoted: boolean;
  homeroomTeacherName: string | null;
  issuedAt: string;
  verificationCode: string;
  directorSignatureDataUri?: string | null;
  profile: InstitutionalProfile;
}) {
  return (
    <Document title={`Certificado de Cierre de Año Escolar - ${studentName}`}>
      <Page size="A4" style={[pdfStyles.page, { padding: 30 }]}>
        <CertificateInstitutionalHeader title="CERTIFICADO DE CIERRE DE AÑO ESCOLAR" year={year} profile={profile} />

        <Text style={compactParagraph}>
          La {profile.name}, reconocida oficialmente por el Ministerio de Educación de la República de Chile, según Resolución RECOFI{" "}
          {profile.officialRecognition.recofi}, RBD {profile.rbd}, certifica que:
        </Text>
        <Text style={compactParagraph}>
          <Text style={pdfStyles.bold}>{studentName.toUpperCase()}</Text>, RUN <Text style={pdfStyles.bold}>{formatRun(studentRun)}</Text>,
        </Text>
        <Text style={compactParagraph}>
          estudiante de <Text style={pdfStyles.bold}>{courseFormalName}</Text>, ha finalizado el año escolar {year}, registrando las
          siguientes calificaciones finales, asistencia y situación de promoción, de acuerdo con el Plan y Programas de Estudio aprobado
          por {profile.officialRecognition.planDecree} y con las normas establecidas en el {profile.officialRecognition.evaluationDecree}.
        </Text>

        <GradesWordsTable rows={rows} showWords={false} scoreColumnLabel="Calificación final" />

        <View style={{ marginTop: 8 }}>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Promedio General Final: </Text>
            {generalAverage === null ? "—" : generalAverage.toFixed(1).replace(".", ",")}
          </Text>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Porcentaje de Asistencia Anual: </Text>
            {attendanceRate === null ? "Sin información" : `${attendanceRate.toFixed(0)} %`}
          </Text>
        </View>

        <View style={{ marginTop: 4 }}>
          <Text style={compactHeading}>Situación de Cierre</Text>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Situación Final: </Text>
            {promoted ? "PROMOVIDA/O" : "NO PROMOVIDA/O"}
          </Text>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Curso aprobado: </Text>
            {courseFormalName}
          </Text>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Curso al que es promovida/o: </Text>
            {promoted ? nextCourseFormalName ?? "Concluye la Enseñanza Básica en el establecimiento" : "No corresponde"}
          </Text>
        </View>

        <View style={{ marginTop: 0 }}>
          <Text style={compactHeading}>Observaciones</Text>
          <Text style={compactParagraph}>
            El proceso académico correspondiente al año escolar {year} ha finalizado, conforme a las disposiciones establecidas en el{" "}
            {profile.officialRecognition.evaluationDecree} y en el Reglamento de Evaluación y Promoción Escolar del establecimiento.
          </Text>
          <Text style={compactParagraph}>
            Se extiende el presente certificado para dejar constancia del cierre de su proceso académico correspondiente al año escolar
            señalado.
          </Text>
        </View>

        <CertificateSignatureFooter
          homeroomTeacherName={homeroomTeacherName}
          issuedAt={issuedAt}
          folio={folio}
          verificationCode={verificationCode}
          directorSignatureDataUri={directorSignatureDataUri}
          profile={profile}
        />
      </Page>
    </Document>
  );
}
