import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { DirectorSignatureImage } from "./OfficialCertificateShared";
import { PARVULARIA_INTRO, PARVULARIA_LEVEL_TITLE, PARVULARIA_SCALE, parvulariaShort } from "@/config/parvularia";
import { ageLabel, evaluationKey, groupIndicators, indicatorNumbers } from "@/lib/parvularia";
import { formatDate } from "@/lib/utils";
import type { ParvulariaReportData } from "@/services/parvularia";

const GREEN = "#274a3a";
const LIGHT = "#f0f5f3";
const BORDER = "#dce8e2";

const SIGNATURE_AREA_HEIGHT = 74;
const SIGNATURE_BLOCK_WIDTH = 160;
// La firma (120) + timbre (60) + separación de DirectorSignatureImage miden 186: el bloque del Director debe ser más ancho.
const DIRECTOR_BLOCK_WIDTH = 200;
const SIGNATURE_LINE_WIDTH = 150;

export interface ParvulariaReportContext {
  establishmentName: string;
  rbd: string;
  homeroomTeacherName: string | null;
  directorName: string;
  directorTitle: string;
  directorSignatureDataUri?: string | null;
  stampDataUri?: string | null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER }}>
      <Text style={{ width: 120, padding: 3, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREEN, backgroundColor: LIGHT }}>{label}</Text>
      <Text style={{ flex: 1, padding: 3, fontSize: 8.5 }}>{value || " "}</Text>
    </View>
  );
}

const cell = { fontSize: 8, padding: 2.5 } as const;

function Mark({ value }: { value: string }) {
  return <Text style={{ ...cell, width: 44, textAlign: "center", fontFamily: "Helvetica-Bold", borderLeftWidth: 1, borderLeftColor: BORDER }}>{value}</Text>;
}

/** Una hoja del Informe Pedagógico de Educación Parvularia -- la misma para la emisión individual y la masiva. */
export function ParvulariaReportPage({ report, context }: { report: ParvulariaReportData; context: ParvulariaReportContext }) {
  const groups = groupIndicators(report.indicators);
  const deliveryDate = report.deliveryDate ? new Date(`${report.deliveryDate}T12:00:00`) : null;
  const numbers = indicatorNumbers(groups);

  return (
    <Page size="LETTER" style={{ ...pdfStyles.page, padding: 34, paddingBottom: 46, fontSize: 9 }} wrap>
      <DocumentHeader />
      <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", color: "#1c3229" }}>INFORME PEDAGÓGICO EDUCACIÓN PARVULARIA</Text>
      <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", textAlign: "center", color: GREEN, marginTop: 2, marginBottom: 8 }}>
        {PARVULARIA_LEVEL_TITLE[report.level]}
      </Text>
      <Text style={{ fontSize: 8.5, lineHeight: 1.4, textAlign: "justify", marginBottom: 8 }}>{PARVULARIA_INTRO}</Text>

      <View style={{ borderWidth: 1, borderColor: BORDER, marginBottom: 8 }}>
        <View style={{ flexDirection: "row" }}>
          <Text style={{ width: 120, padding: 3, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREEN, backgroundColor: LIGHT }}>Establecimiento:</Text>
          <Text style={{ flex: 1, padding: 3, fontSize: 8.5 }}>{context.establishmentName}</Text>
        </View>
        <InfoRow label="RBD:" value={context.rbd} />
        <InfoRow label="Nombre del Párvulo:" value={report.studentName} />
        <InfoRow label="Curso:" value={report.courseLabel} />
        <InfoRow label="Fecha de Nacimiento:" value={report.birthDate ? formatDate(report.birthDate, { day: "numeric", month: "long", year: "numeric" }) : ""} />
        <InfoRow label="Edad:" value={ageLabel(report.birthDate, deliveryDate ?? new Date())} />
        <InfoRow label="Fecha entrega Informe:" value={deliveryDate ? formatDate(report.deliveryDate, { day: "numeric", month: "long", year: "numeric" }) : ""} />
      </View>

      {groups.map((group) => (
        <View key={group.ambito}>
          <Text
            style={{ backgroundColor: GREEN, color: "#ffffff", fontSize: 9, fontFamily: "Helvetica-Bold", padding: 4, marginTop: 6 }}
            minPresenceAhead={70}
          >
            ÁMBITO: {group.ambito}
          </Text>
          {group.nucleos.map((nucleo) => (
            <View key={nucleo.nucleo} style={{ borderWidth: 1, borderColor: BORDER, marginTop: 4 }}>
              <View style={{ flexDirection: "row", backgroundColor: LIGHT, alignItems: "center" }} minPresenceAhead={50}>
                <Text style={{ ...cell, flex: 1, fontFamily: "Helvetica-Bold", color: GREEN }}>Núcleo: {nucleo.nucleo}</Text>
                <Text style={{ ...cell, width: 44, textAlign: "center", fontFamily: "Helvetica-Bold", color: GREEN, fontSize: 7 }}>1° Semestre</Text>
                <Text style={{ ...cell, width: 44, textAlign: "center", fontFamily: "Helvetica-Bold", color: GREEN, fontSize: 7 }}>2° Semestre</Text>
              </View>
              {nucleo.indicators.map((ind) => {
                return (
                  <View key={ind.id} style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER }} wrap={false}>
                    <Text style={{ ...cell, width: 20, textAlign: "center", color: "#5c6b66" }}>{numbers.get(ind.id)}</Text>
                    <Text style={{ ...cell, flex: 1 }}>{ind.text}</Text>
                    <Mark value={parvulariaShort(report.values[evaluationKey(ind.id, 1)])} />
                    <Mark value={parvulariaShort(report.values[evaluationKey(ind.id, 2)])} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}

      <View style={{ marginTop: 10, borderWidth: 1, borderColor: BORDER }} wrap={false}>
        <Text style={{ ...cell, fontFamily: "Helvetica-Bold", color: GREEN, backgroundColor: LIGHT }}>Escala de Evaluación Conceptual</Text>
        {PARVULARIA_SCALE.map((s) => (
          <View key={s.value} style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER }}>
            <Text style={{ ...cell, width: 30, textAlign: "center", fontFamily: "Helvetica-Bold" }}>{s.short}</Text>
            <Text style={{ ...cell, flex: 1 }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{s.label}: </Text>
              {s.description}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 10 }} wrap={false}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 3 }}>Observaciones:</Text>
        <View style={{ borderWidth: 1, borderColor: BORDER, minHeight: 56, padding: 5 }}>
          <Text style={{ fontSize: 8.5, lineHeight: 1.4, textAlign: "justify" }}>{report.observations?.trim() || " "}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }} wrap={false}>
        <View style={{ width: SIGNATURE_BLOCK_WIDTH, alignItems: "center" }}>
          <View style={{ height: SIGNATURE_AREA_HEIGHT, width: SIGNATURE_LINE_WIDTH, justifyContent: "flex-end", alignItems: "center" }}>
            <View style={{ ...pdfStyles.signatureLine, marginTop: 0, width: SIGNATURE_LINE_WIDTH }} />
          </View>
          <Text style={pdfStyles.signatureName}>APODERADO</Text>
        </View>
        <View style={{ width: SIGNATURE_BLOCK_WIDTH, alignItems: "center" }}>
          <View style={{ height: SIGNATURE_AREA_HEIGHT, width: SIGNATURE_LINE_WIDTH, justifyContent: "flex-end", alignItems: "center" }}>
            <View style={{ ...pdfStyles.signatureLine, marginTop: 0, width: SIGNATURE_LINE_WIDTH }} />
          </View>
          {context.homeroomTeacherName && <Text style={pdfStyles.signatureName}>{context.homeroomTeacherName}</Text>}
          <Text style={pdfStyles.signatureTitle}>EDUCADORA DE PÁRVULOS</Text>
        </View>
        <View style={{ width: DIRECTOR_BLOCK_WIDTH, alignItems: "center" }}>
          <View style={{ height: SIGNATURE_AREA_HEIGHT, width: DIRECTOR_BLOCK_WIDTH, justifyContent: "flex-end", alignItems: "center" }}>
            <DirectorSignatureImage
              directorSignatureDataUri={context.directorSignatureDataUri}
              stampDataUri={context.stampDataUri}
              lineStyle={{ marginTop: 0, width: SIGNATURE_LINE_WIDTH }}
            />
          </View>
          <Text style={pdfStyles.signatureName}>{context.directorName}</Text>
          <Text style={pdfStyles.signatureTitle}>DIRECTOR(A)</Text>
        </View>
      </View>

      <Text
        style={{ position: "absolute", bottom: 18, left: 34, right: 34, textAlign: "center", fontSize: 7.5, color: "#8a938f" }}
        fixed
        render={({ subPageNumber, subPageTotalPages }) => `${report.studentName} · ${report.courseLabel} · Año ${report.year} · Página ${subPageNumber} de ${subPageTotalPages}`}
      />
    </Page>
  );
}

export function ParvulariaReportDocument({ report, context }: { report: ParvulariaReportData; context: ParvulariaReportContext }) {
  return (
    <Document title={`Informe Pedagógico ${report.courseLabel} - ${report.studentName}`}>
      <ParvulariaReportPage report={report} context={context} />
    </Document>
  );
}
