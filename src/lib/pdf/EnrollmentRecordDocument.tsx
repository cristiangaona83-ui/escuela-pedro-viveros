import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate } from "@/lib/utils";

export interface EnrollmentRecordData {
  fullName: string;
  run: string;
  birthDate: string | null;
  status: string;
  courseLabel: string | null;
  academicYear: number | null;
  enrolledAt: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  homeroomTeacher: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  issuedAt: string;
}

const row = (label: string, value: string) => (
  <View style={{ flexDirection: "row", marginBottom: 6 }}>
    <Text style={{ width: 140, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#325a38" }}>{label}</Text>
    <Text style={{ fontSize: 9, color: "#1c2624" }}>{value || "—"}</Text>
  </View>
);

export function EnrollmentRecordDocument(data: EnrollmentRecordData) {
  return (
    <Document title={`Ficha de Matrícula - ${data.fullName}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader />

        <Text style={pdfStyles.title}>FICHA DE MATRÍCULA DEL ESTUDIANTE</Text>

        <View style={{ marginTop: 8, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 6, padding: 12 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#213c30" }}>Datos del estudiante</Text>
          {row("Nombre completo", data.fullName)}
          {row("RUN", data.run)}
          {row("Fecha de nacimiento", data.birthDate ? formatDate(data.birthDate) : "—")}
          {row("Estado de matrícula", data.status)}
        </View>

        <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 6, padding: 12 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#213c30" }}>Datos de matrícula</Text>
          {row("Curso", data.courseLabel ?? "Sin matrícula activa")}
          {row("Año académico", data.academicYear ? String(data.academicYear) : "—")}
          {row("Fecha de matrícula", data.enrolledAt ? formatDate(data.enrolledAt) : "—")}
          {row("Profesor/a jefe", data.homeroomTeacher ?? "Sin asignar")}
        </View>

        <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 6, padding: 12 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#213c30" }}>Apoderado/a principal</Text>
          {row("Nombre", data.guardianName ?? "Sin apoderado registrado")}
          {row("Vínculo", data.guardianRelationship ?? "—")}
          {row("Teléfono", data.guardianPhone ?? "—")}
          {row("Correo", data.guardianEmail ?? "—")}
        </View>

        <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 6, padding: 12 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#213c30" }}>Contacto de emergencia</Text>
          {row("Nombre", data.emergencyContactName ?? "No registrado")}
          {row("Teléfono", data.emergencyContactPhone ?? "—")}
        </View>

        <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 6, padding: 12 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#213c30" }}>Observaciones</Text>
          <Text style={{ fontSize: 9, color: "#1c2624" }}>{data.notes || "Sin observaciones."}</Text>
        </View>

        <View style={pdfStyles.footerRow}>
          <View style={pdfStyles.signatureBlock}>
            <View style={pdfStyles.signatureLine} />
            <Text style={pdfStyles.signatureName}>Firma apoderado/a</Text>
          </View>
          <View style={pdfStyles.signatureBlock}>
            <View style={pdfStyles.signatureLine} />
            <Text style={pdfStyles.signatureName}>Firma y timbre del establecimiento</Text>
          </View>
        </View>

        <Text style={pdfStyles.disclaimer}>
          Emitido el {formatDate(data.issuedAt)}. Documento de uso interno del establecimiento — no constituye un certificado oficial.
        </Text>
      </Page>
    </Document>
  );
}
