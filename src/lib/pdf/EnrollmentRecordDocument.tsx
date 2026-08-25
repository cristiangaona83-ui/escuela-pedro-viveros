import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate, calculateAge } from "@/lib/utils";

export interface PickupAuthorizationSummary {
  fullName: string;
  relationship: string | null;
  phone: string | null;
}

export interface AuthorizationSummary {
  label: string;
  authorized: boolean;
}

export interface EnrollmentRecordData {
  fullName: string;
  run: string;
  birthDate: string | null;
  nationality: string | null;
  addressLine: string | null;
  status: string;
  enrollmentNumber: string | null;
  courseLabel: string | null;
  academicYear: number | null;
  enrolledAt: string | null;
  firstEnrollmentDate: string | null;
  originSchool: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianAddress: string | null;
  homeroomTeacher: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  pickupAuthorizations: PickupAuthorizationSummary[];
  authorizations: AuthorizationSummary[];
  enrollmentNotes: string | null;
  notes: string | null;
  issuedAt: string;
}

const box = { marginTop: 8, borderWidth: 1, borderColor: "#dce8e2", borderRadius: 6, padding: 10 };
const boxTitle = { fontSize: 9.5, fontFamily: "Helvetica-Bold" as const, marginBottom: 6, color: "#213c30" };

function row(label: string, value: string | null) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", marginBottom: 3 }} key={label}>
      <Text style={{ width: 132, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#325a38" }}>{label}</Text>
      <Text style={{ fontSize: 8.5, color: "#1c2624", flex: 1 }}>{value}</Text>
    </View>
  );
}

export function EnrollmentRecordDocument(data: EnrollmentRecordData) {
  const age = calculateAge(data.birthDate);
  const authorizedOnly = data.authorizations.filter((a) => a.authorized);

  return (
    <Document title={`Ficha de Matrícula - ${data.fullName}`}>
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader folio={data.enrollmentNumber ?? undefined} />
        <Text style={pdfStyles.title}>FICHA DE MATRÍCULA DEL ESTUDIANTE</Text>

        <View style={box}>
          <Text style={boxTitle}>Identificación</Text>
          {row("Nombre completo", data.fullName)}
          {row("RUN", data.run)}
          {row("Fecha de nacimiento", data.birthDate ? `${formatDate(data.birthDate)}${age !== null ? ` (${age} años)` : ""}` : null)}
          {row("Nacionalidad", data.nationality)}
          {row("Domicilio", data.addressLine)}
        </View>

        <View style={box}>
          <Text style={boxTitle}>Matrícula</Text>
          {row("Curso", data.courseLabel ?? "Sin matrícula activa")}
          {row("Año académico", data.academicYear ? String(data.academicYear) : null)}
          {row("Estado", data.status)}
          {row("Fecha de matrícula", data.enrolledAt ? formatDate(data.enrolledAt) : null)}
          {row("Fecha de ingreso al establecimiento", data.firstEnrollmentDate ? formatDate(data.firstEnrollmentDate) : null)}
          {row("Profesor/a jefe", data.homeroomTeacher ?? "Sin asignar")}
          {row("Establecimiento de procedencia", data.originSchool)}
        </View>

        <View style={box}>
          <Text style={boxTitle}>Apoderado/a principal</Text>
          {data.guardianName ? (
            <>
              {row("Nombre", data.guardianName)}
              {row("Vínculo", data.guardianRelationship)}
              {row("Teléfono", data.guardianPhone)}
              {row("Correo", data.guardianEmail)}
              {row("Domicilio", data.guardianAddress)}
            </>
          ) : (
            <Text style={{ fontSize: 8.5, color: "#8a938f" }}>Sin apoderado principal registrado.</Text>
          )}
        </View>

        {data.emergencyContactName && (
          <View style={box}>
            <Text style={boxTitle}>Contacto de emergencia</Text>
            {row("Nombre", data.emergencyContactName)}
            {row("Vínculo", data.emergencyContactRelationship)}
            {row("Teléfono", data.emergencyContactPhone)}
          </View>
        )}

        {data.pickupAuthorizations.length > 0 && (
          <View style={box}>
            <Text style={boxTitle}>Personas autorizadas para retirar</Text>
            {data.pickupAuthorizations.map((p, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: "#1c2624", marginBottom: 2 }}>
                {p.fullName}{p.relationship ? ` · ${p.relationship}` : ""}{p.phone ? ` · ${p.phone}` : ""}
              </Text>
            ))}
          </View>
        )}

        {authorizedOnly.length > 0 && (
          <View style={box}>
            <Text style={boxTitle}>Autorizaciones administrativas</Text>
            {authorizedOnly.map((a, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: "#1c2624", marginBottom: 2 }}>• {a.label}</Text>
            ))}
          </View>
        )}

        {(data.enrollmentNotes || data.notes) && (
          <View style={box}>
            <Text style={boxTitle}>Observaciones administrativas</Text>
            {data.enrollmentNotes && <Text style={{ fontSize: 8.5, color: "#1c2624" }}>{data.enrollmentNotes}</Text>}
            {data.notes && <Text style={{ fontSize: 8.5, color: "#1c2624", marginTop: data.enrollmentNotes ? 3 : 0 }}>{data.notes}</Text>}
          </View>
        )}

        <View wrap={false}>
          <View style={[pdfStyles.footerRow, { justifyContent: "center" }]}>
            <View style={pdfStyles.signatureBlock}>
              <Text style={{ fontSize: 8, color: "#5c6b66", marginBottom: 2 }}>Funcionario responsable: _______________________</Text>
              <View style={pdfStyles.signatureLine} />
              <Text style={pdfStyles.signatureName}>Firma</Text>
              <Text style={pdfStyles.signatureTitle}>Timbre del establecimiento</Text>
            </View>
          </View>

          <Text style={pdfStyles.disclaimer}>
            Emitido el {formatDate(data.issuedAt)}
            {data.academicYear ? ` · Año académico ${data.academicYear}` : ""}. Documento de uso interno del
            establecimiento — no constituye un certificado oficial.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
