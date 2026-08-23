import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

export interface SignatureEntry {
  name: string;
  title: string;
}

const GUARDIAN_BLANK = "_______________________________________________";

/** Espacio de nombre y firma del apoderado/a — nunca incluye su RUN.
 * Si existe apoderado principal, su nombre se precarga; si no, queda en
 * blanco para completarse a mano. La firma siempre queda en blanco. */
export function GuardianSignatureFields({ guardianName }: { guardianName?: string | null }) {
  return (
    <View style={{ marginTop: 32, borderTopWidth: 1, borderTopColor: "#dce8e2", paddingTop: 12 }}>
      <Text style={{ fontSize: 9, marginBottom: 14, color: "#1c2624" }}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Nombre apoderado/a: </Text>
        {guardianName || GUARDIAN_BLANK}
      </Text>
      <Text style={{ fontSize: 9, color: "#1c2624" }}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Firma apoderado/a: </Text>
        {GUARDIAN_BLANK}
      </Text>
    </View>
  );
}

/** Fila de firmas institucionales (profesor/a jefe, UTP, director, etc.),
 * seguida siempre del espacio de nombre y firma del apoderado/a. La
 * combinación de firmas institucionales varía según el documento — este
 * componente solo se encarga del diseño, no decide qué firmas corresponden. */
export function DocumentSignatures({
  signatures,
  guardianName,
}: {
  signatures: SignatureEntry[];
  guardianName?: string | null;
}) {
  const blockWidth = signatures.length <= 2 ? 200 : signatures.length === 3 ? 150 : 115;

  return (
    <View style={{ marginTop: 48 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: signatures.length <= 2 ? "space-between" : "space-around",
          flexWrap: "wrap",
          rowGap: 24,
        }}
      >
        {signatures.map((s, i) => (
          <View key={i} style={{ alignItems: "center", width: blockWidth }}>
            <View style={pdfStyles.signatureLine} />
            <Text style={pdfStyles.signatureName}>{s.name || "—"}</Text>
            <Text style={pdfStyles.signatureTitle}>{s.title}</Text>
          </View>
        ))}
      </View>
      <GuardianSignatureFields guardianName={guardianName} />
    </View>
  );
}
