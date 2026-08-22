import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { SITE } from "@/config/site";
import { formatDate } from "@/lib/utils";
import type { AttendanceReportRow } from "@/services/attendance-report";

function getLogoDataUri() {
  try {
    const logoPath = join(process.cwd(), "public", "images", "logo-escuela.jpg");
    return `data:image/jpeg;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
}

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
  const logoDataUri = getLogoDataUri();

  return (
    <Document title={`Reporte de Asistencia - ${courseLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {logoDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML
              <Image src={logoDataUri} style={{ width: 44, height: 44, borderRadius: 8 }} />
            ) : (
              <View style={pdfStyles.logoBox}>
                <Text style={pdfStyles.logoText}>PV</Text>
              </View>
            )}
            <View style={{ marginLeft: 8 }}>
              <Text style={pdfStyles.schoolName}>{SITE.name}</Text>
              <Text style={pdfStyles.schoolAddress}>{SITE.address.full}</Text>
            </View>
          </View>
        </View>

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
