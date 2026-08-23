import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate } from "@/lib/utils";
import type { AttendanceReportRow } from "@/services/attendance-report";

export function AttendanceReportDocument({
  courseLabel,
  dateFrom,
  dateTo,
  rows,
  issuedAt,
  issuedBy,
}: {
  courseLabel: string;
  dateFrom: string;
  dateTo: string;
  rows: AttendanceReportRow[];
  issuedAt: string;
  issuedBy: string;
}) {
  return (
    <Document title={`Reporte de Asistencia - ${courseLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader />

        <Text style={pdfStyles.title}>REPORTE DE ASISTENCIA</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 16, color: "#5c6b66" }}>
          {courseLabel} · {formatDate(dateFrom)} al {formatDate(dateTo)}
        </Text>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={[pdfStyles.th, { flex: 2 }]}>Estudiante</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Presente</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Ausente</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Atraso</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Retiro</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>% Asistencia</Text>
          </View>
          {rows.map((r) => (
            <View style={pdfStyles.tableRow} key={r.studentRun}>
              <Text style={[pdfStyles.td, { flex: 2 }]}>{r.studentName}</Text>
              <Text style={pdfStyles.tdCenter}>{r.presente}</Text>
              <Text style={pdfStyles.tdCenter}>{r.ausente}</Text>
              <Text style={pdfStyles.tdCenter}>{r.atraso}</Text>
              <Text style={pdfStyles.tdCenter}>{r.retiro}</Text>
              <Text style={pdfStyles.tdCenter}>{r.attendanceRate !== null ? `${r.attendanceRate}%` : "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.disclaimer}>
          % Asistencia = (presente + atraso) / total de días con registro. Generado el {formatDate(issuedAt)} por {issuedBy}.
          Documento de uso interno del establecimiento — no constituye un certificado oficial.
        </Text>
      </Page>
    </Document>
  );
}
