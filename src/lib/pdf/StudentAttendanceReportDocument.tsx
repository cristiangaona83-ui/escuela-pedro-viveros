import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate, formatRun } from "@/lib/utils";
import { SEMAFORO_LABEL } from "@/lib/attendance/calc";
import type { StudentAttendanceDetail } from "@/services/attendance-analytics";

const STATUS_LABEL: Record<string, string> = { presente: "Presente", ausente: "Ausente", atraso: "Atraso", retiro: "Retiro" };

export function StudentAttendanceReportDocument({
  detail,
  rangeLabel,
  issuedAt,
  issuedBy,
}: {
  detail: StudentAttendanceDetail;
  rangeLabel: string;
  issuedAt: string;
  issuedBy: string;
}) {
  return (
    <Document title={`Reporte de Asistencia - ${detail.fullName}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader />

        <Text style={pdfStyles.title}>REPORTE INDIVIDUAL DE ASISTENCIA</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 16, color: "#5c6b66" }}>
          {detail.fullName} · {detail.courseLabel ?? "—"} · {rangeLabel}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 9, color: "#374b43" }}>RUN: {formatRun(detail.run)}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>% Anual: {detail.yearRate !== null ? `${detail.yearRate}%` : "—"}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Estado: {SEMAFORO_LABEL[detail.semaforo]}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Presente: {detail.counts.presente}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Ausente: {detail.counts.ausente}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Atraso: {detail.counts.atraso}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Retiro: {detail.counts.retiro}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Última ausencia: {detail.lastAbsence ? formatDate(detail.lastAbsence) : "—"}</Text>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={[pdfStyles.th, { flex: 1 }]}>Fecha</Text>
            <Text style={[pdfStyles.th, { flex: 1, textAlign: "center" }]}>Estado</Text>
            <Text style={[pdfStyles.th, { flex: 2 }]}>Observación</Text>
          </View>
          {detail.history.map((h, i) => (
            <View style={pdfStyles.tableRow} key={`${h.date}-${i}`}>
              <Text style={[pdfStyles.td, { flex: 1 }]}>{formatDate(h.date)}</Text>
              <Text style={[pdfStyles.tdCenter, { flex: 1 }]}>{STATUS_LABEL[h.status] ?? h.status}</Text>
              <Text style={[pdfStyles.td, { flex: 2 }]}>{h.observation ?? "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.disclaimer}>
          % Asistencia = (presente + atraso) / total de días con registro. Documento privado de uso interno — generado el {formatDate(issuedAt)} por{" "}
          {issuedBy}. No constituye un certificado oficial.
        </Text>
      </Page>
    </Document>
  );
}
