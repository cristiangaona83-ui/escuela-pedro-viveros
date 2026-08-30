import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { CertificateInstitutionalHeader, GradesWordsTable, CertificateSignatureFooter, compactParagraph, compactHeading } from "./OfficialCertificateShared";
import { gradeToWords } from "./academic-certificate-wording";
import { formatRun } from "@/lib/utils";
import type { SubjectAverageRow } from "./OfficialCertificateShared";
import type { InstitutionalProfile } from "@/services/school-config";

export interface CertificadoAnualEstudiosProps {
  folio: string;
  studentName: string;
  studentRun: string;
  courseFormalName: string;
  year: number;
  rows: SubjectAverageRow[];
  generalAverage: number | null;
  attendanceRate: number | null;
  promotionSentence: string;
  homeroomTeacherName: string | null;
  issuedAt: string;
  verificationCode: string;
  directorSignatureDataUri?: string | null;
  stampDataUri?: string | null;
  profile: InstitutionalProfile;
}

/**
 * Solo el <Page> -- sin <Document> envolvente -- para poder componer varias
 * de estas páginas (una por estudiante) dentro de un único <Document> en la
 * impresión masiva por curso (ver bulk-report-documents.tsx). El uso
 * individual (CertificadoAnualEstudiosDocument, abajo) sigue exactamente
 * igual que antes: un <Document> con esta misma página adentro.
 */
export function CertificadoAnualEstudiosPage({
  folio,
  studentName,
  studentRun,
  courseFormalName,
  year,
  rows,
  generalAverage,
  attendanceRate,
  promotionSentence,
  homeroomTeacherName,
  issuedAt,
  verificationCode,
  directorSignatureDataUri,
  stampDataUri,
  profile,
}: CertificadoAnualEstudiosProps) {
  return (
      <Page size="A4" style={[pdfStyles.page, { padding: 30 }]}>
        <CertificateInstitutionalHeader title="CERTIFICADO ANUAL DE ESTUDIOS" year={year} profile={profile} />

        <Text style={compactParagraph}>
          La {profile.name}, reconocida oficialmente por el Ministerio de Educación de la República de Chile, según Resolución RECOFI{" "}
          {profile.officialRecognition.recofi}, RBD {profile.rbd}, otorga el presente Certificado Anual de Estudios, correspondiente a las
          calificaciones anuales y situación final de:
        </Text>
        <Text style={compactParagraph}>
          <Text style={pdfStyles.bold}>{studentName.toUpperCase()}</Text>, RUN <Text style={pdfStyles.bold}>{formatRun(studentRun)}</Text>,
        </Text>
        <Text style={compactParagraph}>
          estudiante de <Text style={pdfStyles.bold}>{courseFormalName}</Text>, de acuerdo con el Plan y Programas de Estudio aprobado por{" "}
          {profile.officialRecognition.planDecree} y con las normas de evaluación, calificación y promoción escolar establecidas en el{" "}
          {profile.officialRecognition.evaluationDecree}.
        </Text>

        <GradesWordsTable rows={rows} showWords scoreColumnLabel="Calificación final" />

        <View style={{ marginTop: 8 }}>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Promedio General: </Text>
            {generalAverage === null ? "—" : generalAverage.toFixed(1).replace(".", ",")} — {gradeToWords(generalAverage)}
          </Text>
          <Text style={compactParagraph}>
            <Text style={pdfStyles.bold}>Porcentaje de Asistencia: </Text>
            {attendanceRate === null ? "Sin información" : `${attendanceRate.toFixed(0)} %`}
          </Text>
        </View>

        <View style={{ marginTop: 4 }}>
          <Text style={compactHeading}>Situación Final</Text>
          <Text style={compactParagraph}>{promotionSentence}</Text>
        </View>

        <View style={{ marginTop: 0 }}>
          <Text style={compactHeading}>Observaciones</Text>
          <Text style={compactParagraph}>
            La situación final ha sido determinada conforme a las disposiciones establecidas en el {profile.officialRecognition.evaluationDecree}{" "}
            y en el Reglamento de Evaluación y Promoción Escolar del establecimiento.
          </Text>
        </View>

        <CertificateSignatureFooter
          homeroomTeacherName={homeroomTeacherName}
          issuedAt={issuedAt}
          folio={folio}
          verificationCode={verificationCode}
          directorSignatureDataUri={directorSignatureDataUri}
          stampDataUri={stampDataUri}
          profile={profile}
        />
      </Page>
  );
}

/** Uso individual (sin cambios de comportamiento): un <Document> con la misma página que arriba. */
export function CertificadoAnualEstudiosDocument(props: CertificadoAnualEstudiosProps) {
  return (
    <Document title={`Certificado Anual de Estudios - ${props.studentName}`}>
      <CertificadoAnualEstudiosPage {...props} />
    </Document>
  );
}
