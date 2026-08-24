import { readFileSync } from "node:fs";
import { join } from "node:path";
import { View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { SITE } from "@/config/site";

/** Base única del logo institucional para todo documento imprimible/PDF de
 * la plataforma (certificados, informes, listados, ficha de matrícula,
 * etc.) — un solo lugar que lee el archivo y arma el data URI, para que
 * nunca haya dos copias del logo ni del nombre del establecimiento. */
export function getLogoDataUri() {
  try {
    const logoPath = join(process.cwd(), "public", "images", "logo-escuela-renovado.png");
    return `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Cabecera institucional uniforme: logo + nombre + dirección del
 * establecimiento, iguales en todo documento generado desde la plataforma.
 * `folio` es opcional — solo los certificados con folio correlativo lo
 * muestran. `dateLabel` es opcional — una etiqueta libre alineada a la
 * derecha (ej. "San Antonio, 24 de agosto de 2026"), usada por documentos
 * que no llevan folio pero sí fecha de emisión visible, como los
 * Informativos Semanales. Ambos comparten el mismo espacio a la derecha del
 * encabezado; ningún documento existente pasa ambos a la vez. */
export function DocumentHeader({ folio, dateLabel }: { folio?: string; dateLabel?: string }) {
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
      {folio && <Text style={pdfStyles.folio}>Folio {folio}</Text>}
      {!folio && dateLabel && <Text style={pdfStyles.folio}>{dateLabel}</Text>}
    </View>
  );
}
