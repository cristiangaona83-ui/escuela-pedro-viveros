import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { DirectorSignatureImage } from "./OfficialCertificateShared";
import { formatDate } from "@/lib/utils";
import { WEEKDAY_LABELS, accidentWeekday } from "@/features/seguro-escolar/utils";
import { SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS_PLAIN, SEGURO_ESCOLAR_CARE_MEASURE_LABELS } from "@/features/seguro-escolar/labels";
import type { SeguroEscolarAccidentType, SeguroEscolarCareMeasure } from "@/types/database";

/**
 * Documento institucional propio de la escuela para el Seguro Escolar
 * Digital -- ya NO reproduce visualmente el formulario oficial 0374-3 (ese
 * sigue disponible como respaldo aparte vía seguro-escolar-overlay.ts, solo
 * que ya no es el que genera el botón "Descargar PDF"). El 0374-3 se usó
 * únicamente como referencia para identificar qué datos son los esenciales
 * a conservar; el diseño y la disposición son propios de la plataforma,
 * reutilizando los mismos componentes institucionales (DocumentHeader,
 * pdfStyles, DirectorSignatureImage) que el resto de documentos emitidos.
 */

const local = StyleSheet.create({
  sectionBlock: { marginTop: 12, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 4 },
  sectionTitle: {
    backgroundColor: "#f0f5f3",
    color: "#274a3a",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 0.4,
    padding: 7,
  },
  sectionBody: { padding: 10, flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8 },
  field: { marginBottom: 2 },
  fieldLabel: { fontSize: 7, color: "#5c6b66", textTransform: "uppercase", letterSpacing: 0.3 },
  fieldValue: { fontSize: 9.5, color: "#1c2624", marginTop: 1 },
  fieldValueMultiline: { fontSize: 9.5, color: "#1c2624", marginTop: 1, lineHeight: 1.4 },
});

function Field({ label, value, width }: { label: string; value: string | null | undefined; width?: number | string }) {
  return (
    <View style={[local.field, { width: width ?? "31%" }]}>
      <Text style={local.fieldLabel}>{label}</Text>
      <Text style={local.fieldValue}>{value && value.trim() ? value : "—"}</Text>
    </View>
  );
}

function WideField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={[local.field, { width: "100%" }]}>
      <Text style={local.fieldLabel}>{label}</Text>
      <Text style={local.fieldValueMultiline}>{value && value.trim() ? value : "—"}</Text>
    </View>
  );
}

function SectionBlock({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={local.sectionBlock} wrap={false}>
      <Text style={local.sectionTitle}>
        {n}. {title}
      </Text>
      <View style={local.sectionBody}>{children}</View>
    </View>
  );
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

export interface SeguroEscolarInstitutionalPdfInput {
  folio: string;
  issuedAtLabel: string;

  studentFullName: string;
  courseLabel: string;
  birthDateLabel: string | null;
  age: number | null;
  sex: "M" | "F" | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;

  accidentDate: string;
  accidentHour: number | null;
  accidentMinute: number | null;
  location: string | null;
  accidentType: SeguroEscolarAccidentType;
  activity: string | null;
  circumstance: string;

  witnessAName: string | null;
  witnessAId: string | null;
  witnessBName: string | null;
  witnessBId: string | null;

  initialCare: string | null;
  careStaffName: string | null;
  careTime: string | null;
  careMeasure: SeguroEscolarCareMeasure | null;

  guardianContact: {
    contactName: string;
    contactDate: string;
    contactTime: string | null;
    contactMethod: string;
    staffName: string | null;
    result: string | null;
  } | null;

  assistanceEstablishment: string | null;
  referralDepartureTime: string | null;
  referralAccompanyingAdult: string | null;
  referralTransportMeans: string | null;

  observations: string | null;

  directorName: string;
  directorTitle: string;
  schoolName: string;
  directorSignatureDataUri: string | null;
  stampDataUri: string | null;
}

export function SeguroEscolarInstitutionalDocument(input: SeguroEscolarInstitutionalPdfInput) {
  const weekday = accidentWeekday(input.accidentDate);
  const hh = input.accidentHour !== null ? String(input.accidentHour).padStart(2, "0") : null;
  const mm = input.accidentMinute !== null ? String(input.accidentMinute).padStart(2, "0") : null;
  const accidentTime = hh !== null && mm !== null ? `${hh}:${mm} hrs.` : null;

  const showWitnesses = input.accidentType === "trayecto";
  const showReferral = Boolean(
    input.careMeasure === "derivacion_centro_asistencial" ||
      input.careMeasure === "traslado_ambulancia" ||
      input.assistanceEstablishment ||
      input.referralDepartureTime ||
      input.referralAccompanyingAdult ||
      input.referralTransportMeans
  );

  return (
    <Document title={`Seguro Escolar - ${input.folio}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader folio={input.folio} />

        <Text style={pdfStyles.title}>SEGURO ESCOLAR{"\n"}REGISTRO DE ACCIDENTE ESCOLAR</Text>

        <SectionBlock n={1} title="Datos del estudiante">
          <Field label="Nombre completo" value={input.studentFullName} width="48%" />
          <Field label="Curso" value={input.courseLabel} width="20%" />
          <Field label="Fecha de nacimiento" value={input.birthDateLabel} width="27%" />
          <Field label="Edad" value={input.age !== null ? String(input.age) : null} width="20%" />
          <Field label="Sexo" value={input.sex === "M" ? "Masculino" : input.sex === "F" ? "Femenino" : null} width="27%" />
          <Field label="Domicilio" value={input.address} width="48%" />
          <Field label="Apoderado" value={input.guardianName} width="48%" />
          <Field label="Teléfono de contacto" value={input.guardianPhone} width="48%" />
        </SectionBlock>

        <SectionBlock n={2} title="Datos del accidente">
          <Field label="Fecha" value={formatDate(input.accidentDate)} width="27%" />
          <Field label="Hora" value={accidentTime} width="20%" />
          <Field label="Día de la semana" value={weekday !== null ? WEEKDAY_LABELS[weekday] : null} width="27%" />
          <Field label="Lugar" value={input.location} width="20%" />
          <Field label="Tipo" value={SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS_PLAIN[input.accidentType]} width="48%" />
          <Field label="Actividad que realizaba" value={input.activity} width="48%" />
          <WideField label="Circunstancias del accidente" value={input.circumstance} />
        </SectionBlock>

        {showWitnesses && (
          <SectionBlock n={3} title="Testigos">
            <Field label="Nombre testigo 1" value={input.witnessAName} width="48%" />
            <Field label="Identificación testigo 1" value={input.witnessAId} width="48%" />
            <Field label="Nombre testigo 2" value={input.witnessBName} width="48%" />
            <Field label="Identificación testigo 2" value={input.witnessBId} width="48%" />
          </SectionBlock>
        )}

        <SectionBlock n={4} title="Atención y procedimiento">
          <WideField label="Atención inicial realizada" value={input.initialCare} />
          <Field label="Funcionario que atendió" value={input.careStaffName} width="31%" />
          <Field label="Hora de atención" value={formatTime(input.careTime)} width="31%" />
          <Field label="Medida adoptada" value={input.careMeasure ? SEGURO_ESCOLAR_CARE_MEASURE_LABELS[input.careMeasure] : null} width="31%" />
        </SectionBlock>

        <SectionBlock n={5} title="Comunicación con apoderado">
          <Field label="Apoderado contactado" value={input.guardianContact?.contactName ?? null} width="48%" />
          <Field
            label="Hora"
            value={
              input.guardianContact
                ? `${formatDate(input.guardianContact.contactDate)}${input.guardianContact.contactTime ? ` · ${formatTime(input.guardianContact.contactTime)}` : ""}`
                : null
            }
            width="48%"
          />
          <Field label="Medio de contacto" value={input.guardianContact?.contactMethod ?? null} width="48%" />
          <Field label="Funcionario que realizó el contacto" value={input.guardianContact?.staffName ?? null} width="48%" />
          <WideField label="Resultado del contacto" value={input.guardianContact?.result ?? null} />
        </SectionBlock>

        {showReferral && (
          <SectionBlock n={6} title="Derivación">
            <Field label="Centro asistencial" value={input.assistanceEstablishment} width="48%" />
            <Field label="Hora de salida" value={formatTime(input.referralDepartureTime)} width="48%" />
            <Field label="Adulto acompañante" value={input.referralAccompanyingAdult} width="48%" />
            <Field label="Medio de traslado" value={input.referralTransportMeans} width="48%" />
          </SectionBlock>
        )}

        <SectionBlock n={7} title="Observaciones">
          <WideField label="Observaciones adicionales" value={input.observations} />
        </SectionBlock>

        <View style={{ marginTop: 28, alignItems: "center" }} wrap={false}>
          <DirectorSignatureImage directorSignatureDataUri={input.directorSignatureDataUri} stampDataUri={input.stampDataUri} />
          <Text style={[pdfStyles.signatureName, { marginTop: 6 }]}>{input.directorName}</Text>
          <Text style={pdfStyles.signatureTitle}>{input.directorTitle}</Text>
          <Text style={pdfStyles.signatureTitle}>{input.schoolName}</Text>
        </View>

        <Text style={[pdfStyles.paragraph, { textAlign: "center", marginTop: 10, marginBottom: 0 }]}>{input.issuedAtLabel}</Text>
        <Text style={pdfStyles.disclaimer}>
          Documento institucional emitido por la plataforma de la {input.schoolName}. N.º {input.folio}.
        </Text>
      </Page>
    </Document>
  );
}
