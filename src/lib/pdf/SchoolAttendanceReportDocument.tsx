import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate } from "@/lib/utils";
import { SEMAFORO_LABEL } from "@/lib/attendance/calc";
import type { SchoolAttendanceOverview } from "@/services/attendance-analytics";

export function SchoolAttendanceReportDocument({
  overview,
  issuedAt,
  issuedBy,
}: {
  overview: SchoolAttendanceOverview;
  issuedAt: string;
  issuedBy: string;
}) {
  const { range, totals, courses, thresholds } = overview;
  return (
    <Document title="Reporte Institucional de Asistencia">
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader />

        <Text style={pdfStyles.title}>REPORTE INSTITUCIONAL DE ASISTENCIA</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 16, color: "#5c6b66" }}>
          {range.label} · {formatDate(range.from)} al {formatDate(range.to)}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Matrícula considerada: {totals.matricula}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>Promedio escuela: {totals.rate !== null ? `${totals.rate}%` : "—"}</Text>
          <Text style={{ fontSize: 9, color: "#374b43" }}>
            Bajo {thresholds.yellow}%: {totals.critical} estudiantes
          </Text>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={[pdfStyles.th, { flex: 1.6 }]}>Curso</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Matrícula</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>% Asistencia</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>% Inasistencia</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Bajo umbral</Text>
            <Text style={[pdfStyles.th, { textAlign: "center" }]}>Estado</Text>
          </View>
          {courses.map((c) => (
            <View style={pdfStyles.tableRow} key={c.courseId}>
              <Text style={[pdfStyles.td, { flex: 1.6 }]}>{c.courseLabel}</Text>
              <Text style={pdfStyles.tdCenter}>{c.matricula}</Text>
              <Text style={pdfStyles.tdCenter}>{c.rate !== null ? `${c.rate}%` : "—"}</Text>
              <Text style={pdfStyles.tdCenter}>{c.rate !== null ? `${Math.round((100 - c.rate) * 10) / 10}%` : "—"}</Text>
              <Text style={pdfStyles.tdCenter}>{c.belowYellow}</Text>
              <Text style={pdfStyles.tdCenter}>{SEMAFORO_LABEL[c.semaforo]}</Text>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.disclaimer}>
          % Asistencia = (presente + atraso) / total de días con registro. Semáforo de referencia interna (verde ≥ {thresholds.green}%, amarillo ≥{" "}
          {thresholds.yellow}%, rojo bajo {thresholds.yellow}% — configurable, no una clasificación legal). Generado el {formatDate(issuedAt)} por {issuedBy}.
          Documento de uso interno del establecimiento.
        </Text>
      </Page>
    </Document>
  );
}
