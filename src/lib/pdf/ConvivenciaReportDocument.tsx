import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate } from "@/lib/utils";

/** Documento genérico de reporte de Convivencia Educativa (punto 16): un
 * título, una línea de contexto y una tabla de columnas libres — reutilizado
 * por los 7 tipos de reporte (resumen mensual, casos por curso, casos por
 * tipo, casos abiertos, seguimientos pendientes, acciones preventivas,
 * avance del Plan de Gestión). Documento interno — nunca contiene más datos
 * personales que los estrictamente necesarios para cada listado. */
export function ConvivenciaReportDocument({
  title,
  subtitle,
  columns,
  columnWidths,
  rows,
  issuedAt,
}: {
  title: string;
  subtitle: string;
  columns: string[];
  columnWidths?: number[];
  rows: string[][];
  issuedAt: string;
}) {
  const widths = columnWidths ?? columns.map(() => 1);

  return (
    <Document title={title}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader dateLabel={`Emitido el ${formatDate(issuedAt)}`} />

        <Text style={pdfStyles.title}>{title.toUpperCase()}</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 16, color: "#5c6b66" }}>{subtitle}</Text>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            {columns.map((c, i) => (
              <Text key={c} style={[pdfStyles.th, { flex: widths[i] }]}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View style={pdfStyles.tableRow} key={i}>
              {row.map((cell, j) => (
                <Text key={j} style={[pdfStyles.td, { flex: widths[j] }]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={pdfStyles.disclaimer}>Documento interno de la Escuela — información de uso reservado, no distribuir.</Text>
      </Page>
    </Document>
  );
}
