import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { DocumentSignatures, type SignatureEntry } from "./DocumentSignatures";
import { formatDate, formatGrade } from "@/lib/utils";

export interface SubjectAverageRow {
  subjectName: string;
  average: number | null;
}

export function GradesReportDocument({
  folio,
  title,
  subtitle,
  studentName,
  studentRun,
  courseLabel,
  year,
  issuedAt,
  rows,
  generalAverage,
  signatures,
  disclaimer,
}: {
  folio: string;
  title: string;
  subtitle: string;
  studentName: string;
  studentRun: string;
  courseLabel: string;
  year: number;
  issuedAt: string;
  rows: SubjectAverageRow[];
  generalAverage: number | null;
  signatures: SignatureEntry[];
  disclaimer: string;
}) {
  return (
    <Document title={`${title} - ${studentName}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader folio={folio} />
        <Text style={pdfStyles.title}>{title.toUpperCase()}</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 16, color: "#5c6b66" }}>
          {subtitle}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={pdfStyles.paragraph}>
            Estudiante: <Text style={pdfStyles.bold}>{studentName}</Text>
          </Text>
          <Text style={pdfStyles.paragraph}>
            RUN: <Text style={pdfStyles.bold}>{studentRun}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={pdfStyles.paragraph}>
            Curso: <Text style={pdfStyles.bold}>{courseLabel}</Text>
          </Text>
          <Text style={pdfStyles.paragraph}>
            Año académico: <Text style={pdfStyles.bold}>{year}</Text>
          </Text>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={pdfStyles.th}>Asignatura</Text>
            <Text style={[pdfStyles.th, { textAlign: "center", flex: 0.5 }]}>Promedio</Text>
          </View>
          {rows.map((r) => (
            <View style={pdfStyles.tableRow} key={r.subjectName}>
              <Text style={pdfStyles.td}>{r.subjectName}</Text>
              <Text style={[pdfStyles.tdCenter, { flex: 0.5 }]}>{formatGrade(r.average)}</Text>
            </View>
          ))}
          <View style={[pdfStyles.tableRow, { backgroundColor: "#f0f5f3" }]}>
            <Text style={[pdfStyles.td, pdfStyles.bold]}>Promedio general</Text>
            <Text style={[pdfStyles.tdCenter, pdfStyles.bold, { flex: 0.5 }]}>{formatGrade(generalAverage)}</Text>
          </View>
        </View>

        <DocumentSignatures signatures={signatures} />

        <Text style={pdfStyles.disclaimer}>
          Fecha de emisión: {formatDate(issuedAt)} · Folio {folio}. {disclaimer}
        </Text>
      </Page>
    </Document>
  );
}
