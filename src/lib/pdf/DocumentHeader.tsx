import { readFileSync } from "node:fs";
import { join } from "node:path";
import { View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { SITE } from "@/config/site";

function getLogoDataUri() {
  try {
    const logoPath = join(process.cwd(), "public", "images", "logo-escuela.jpg");
    return `data:image/jpeg;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
}

export function DocumentHeader({ folio }: { folio: string }) {
  const logoDataUri = getLogoDataUri();

  return (
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
      <Text style={pdfStyles.folio}>Folio {folio}</Text>
    </View>
  );
}
