import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate } from "@/lib/utils";

/** Acta institucional de entrevista (punto 9). Solo la información
 * estrictamente necesaria del acta — no incluye el resto del expediente
 * del caso. */
export function ConvivenciaInterviewActaDocument({
  caseFolio,
  interviewDate,
  interviewTime,
  participantLabel,
  reason,
  summary,
  agreements,
  commitments,
  followupDate,
  responsibleName,
  issuedAt,
}: {
  caseFolio: string;
  interviewDate: string;
  interviewTime: string | null;
  participantLabel: string;
  reason: string | null;
  summary: string | null;
  agreements: string | null;
  commitments: string | null;
  followupDate: string | null;
  responsibleName: string;
  issuedAt: string;
}) {
  return (
    <Document title={`Acta de entrevista - ${caseFolio}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader dateLabel={`Emitido el ${formatDate(issuedAt)}`} />

        <Text style={pdfStyles.title}>ACTA DE ENTREVISTA</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 20, color: "#5c6b66" }}>
          Caso de Convivencia {caseFolio}
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={pdfStyles.paragraph}>
            <Text style={pdfStyles.bold}>Fecha: </Text>
            {formatDate(interviewDate)}
            {interviewTime ? ` · ${interviewTime.slice(0, 5)} hrs.` : ""}
          </Text>
          <Text style={pdfStyles.paragraph}>
            <Text style={pdfStyles.bold}>Participante: </Text>
            {participantLabel}
          </Text>
          <Text style={pdfStyles.paragraph}>
            <Text style={pdfStyles.bold}>Responsable: </Text>
            {responsibleName}
          </Text>
        </View>

        {reason && (
          <View style={{ marginBottom: 10 }}>
            <Text style={[pdfStyles.bold, { marginBottom: 3 }]}>Motivo</Text>
            <Text style={pdfStyles.paragraph}>{reason}</Text>
          </View>
        )}
        {summary && (
          <View style={{ marginBottom: 10 }}>
            <Text style={[pdfStyles.bold, { marginBottom: 3 }]}>Síntesis</Text>
            <Text style={pdfStyles.paragraph}>{summary}</Text>
          </View>
        )}
        {agreements && (
          <View style={{ marginBottom: 10 }}>
            <Text style={[pdfStyles.bold, { marginBottom: 3 }]}>Acuerdos</Text>
            <Text style={pdfStyles.paragraph}>{agreements}</Text>
          </View>
        )}
        {commitments && (
          <View style={{ marginBottom: 10 }}>
            <Text style={[pdfStyles.bold, { marginBottom: 3 }]}>Compromisos</Text>
            <Text style={pdfStyles.paragraph}>{commitments}</Text>
          </View>
        )}
        {followupDate && (
          <Text style={pdfStyles.paragraph}>
            <Text style={pdfStyles.bold}>Próxima revisión: </Text>
            {formatDate(followupDate)}
          </Text>
        )}

        <View style={pdfStyles.footerRow}>
          <View style={pdfStyles.signatureBlock}>
            <View style={pdfStyles.signatureLine} />
            <Text style={pdfStyles.signatureName}>{responsibleName}</Text>
            <Text style={pdfStyles.signatureTitle}>Responsable de la entrevista</Text>
          </View>
        </View>

        <Text style={pdfStyles.disclaimer}>Documento interno de la Escuela — información de uso reservado, no distribuir.</Text>
      </Page>
    </Document>
  );
}
