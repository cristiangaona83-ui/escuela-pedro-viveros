import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { GuardianSignatureFields } from "./DocumentSignatures";
import { SITE } from "@/config/site";
import { formatDate } from "@/lib/utils";

export function CertificateAlumnoRegular({
  folio,
  studentName,
  studentRun,
  courseLabel,
  year,
  issuedAt,
  signatureName,
  signatureTitle,
  qrDataUrl,
  verificationCode,
  guardianName,
}: {
  folio: string;
  studentName: string;
  studentRun: string;
  courseLabel: string;
  year: number;
  issuedAt: string;
  signatureName: string;
  signatureTitle: string;
  qrDataUrl: string;
  verificationCode: string;
  guardianName?: string | null;
}) {
  return (
    <Document title={`Certificado de Alumno Regular - ${studentName}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader folio={folio} />
        <Text style={pdfStyles.title}>CERTIFICADO DE ALUMNO REGULAR</Text>

        <Text style={pdfStyles.paragraph}>
          El {SITE.name}, con domicilio en {SITE.address.full}, certifica que:
        </Text>
        <Text style={[pdfStyles.paragraph, pdfStyles.bold, { textAlign: "center", fontSize: 13 }]}>
          {studentName}
        </Text>
        <Text style={pdfStyles.paragraph}>
          RUN <Text style={pdfStyles.bold}>{studentRun}</Text>, se encuentra matriculado(a) como estudiante regular en el
          curso <Text style={pdfStyles.bold}>{courseLabel}</Text>, durante el año académico{" "}
          <Text style={pdfStyles.bold}>{year}</Text>.
        </Text>
        <Text style={pdfStyles.paragraph}>
          Se extiende el presente certificado para los fines que el interesado(a) estime conveniente, a solicitud del
          estudiante o su apoderado.
        </Text>

        <View style={pdfStyles.footerRow}>
          <View style={pdfStyles.signatureBlock}>
            <View style={pdfStyles.signatureLine} />
            <Text style={pdfStyles.signatureName}>{signatureName || SITE.director}</Text>
            <Text style={pdfStyles.signatureTitle}>{signatureTitle || "Director(a)"}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML */}
            {qrDataUrl && <Image src={qrDataUrl} style={pdfStyles.qr} />}
            <Text style={{ fontSize: 7, color: "#8a938f", marginTop: 4 }}>Verificar autenticidad</Text>
          </View>
        </View>

        <GuardianSignatureFields guardianName={guardianName} />

        <Text style={pdfStyles.disclaimer}>
          Fecha de emisión: {formatDate(issuedAt)} · Folio {folio} · Documento emitido por la plataforma pedagógica del
          establecimiento. Verifique su autenticidad en {SITE.domains.public}/verificar con el código:
        </Text>
        <Text style={pdfStyles.verificationCode}>{verificationCode}</Text>
      </Page>
    </Document>
  );
}
