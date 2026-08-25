import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

export interface SignatureEntry {
  name: string;
  title: string;
}

/** Fila de firmas institucionales (profesor/a jefe, UTP, director, etc.).
 * La combinación de firmas varía según el documento — este componente solo
 * se encarga del diseño, no decide qué firmas corresponden. */
export function DocumentSignatures({ signatures }: { signatures: SignatureEntry[] }) {
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
    </View>
  );
}
