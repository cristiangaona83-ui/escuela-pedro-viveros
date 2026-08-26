import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { CertificateInstitutionalHeader, GradesWordsTable, CertificateSignatureFooter, compactParagraph, compactHeading } from "./OfficialCertificateShared";
import { gradeToWords } from "./academic-certificate-wording";
import { SITE } from "@/config/site";
import { formatRun } from "@/lib/utils";
import type { SubjectAverageRow } from "./OfficialCertificateShared";

export function CertificadoAnualEstudiosDocument({
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
}: {
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
}) {
  return (
    <Document title={`Certificado Anual de Estudios - ${studentName}`}>
      <Page size="A4" style={[pdfStyles.page, { padding: 30 }]}>
        <CertificateInstitutionalHeader title="CERTIFICADO ANUAL DE ESTUDIOS" year={year} />

        <Text style={compactParagraph}>
          La {SITE.name}, reconocida oficialmente por el Ministerio de Educación de la República de Chile, según Resolución RECOFI{" "}
          {SITE.officialRecognition.recofi}, RBD {SITE.rbd}, otorga el presente Certificado Anual de Estudios, correspondiente a las
          calificaciones anuales y situación final de:
        </Text>
        <Text style={compactParagraph}>
          <Text style={pdfStyles.bold}>{studentName.toUpperCase()}</Text>, RUN <Text style={pdfStyles.bold}>{formatRun(studentRun)}</Text>,
        </Text>
        <Text style={compactParagraph}>
          estudiante de <Text style={pdfStyles.bold}>{courseFormalName}</Text>, de acuerdo con el Plan y Programas de Estudio aprobado por{" "}
          {SITE.officialRecognition.planDecree} y con las normas de evaluación, calificación y promoción escolar establecidas en el{" "}
          {SITE.officialRecognition.evaluationDecree}.
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
            La situación final ha sido determinada conforme a las disposiciones establecidas en el {SITE.officialRecognition.evaluationDecree}{" "}
            y en el Reglamento de Evaluación y Promoción Escolar del establecimiento.
          </Text>
        </View>

        <CertificateSignatureFooter
          homeroomTeacherName={homeroomTeacherName}
          issuedAt={issuedAt}
          folio={folio}
          verificationCode={verificationCode}
          directorSignatureDataUri={directorSignatureDataUri}
        />
      </Page>
    </Document>
  );
}
