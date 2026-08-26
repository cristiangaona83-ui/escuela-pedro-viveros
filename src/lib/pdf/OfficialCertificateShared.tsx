import { View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { getLogoDataUri } from "./DocumentHeader";
import { SITE } from "@/config/site";
import { formatDate } from "@/lib/utils";
import { gradeToWords } from "./academic-certificate-wording";
import type { InstitutionalProfile } from "@/services/school-config";

export interface SubjectAverageRow {
  subjectName: string;
  average: number | null;
}

/**
 * Piezas compartidas por los tres certificados académicos oficiales
 * (Anual, Semestral, Cierre de Año Escolar) -- mismo encabezado
 * institucional, misma tabla de calificaciones y mismo pie de firma en
 * los tres, para no repetir la maquetación tres veces. El párrafo de
 * cuerpo y la sección de situación/observaciones, que sí difieren entre
 * documentos, se arman en cada archivo de certificado por separado.
 *
 * Los datos institucionales (nombre, RBD, RECOFI, decretos, Director) se
 * reciben como prop `profile` (ver getInstitutionalProfile()) en vez de
 * importarse de SITE directamente -- así son editables desde
 * Administración → Configuración institucional sin tocar código.
 */

/** Alto de la zona reservada para la firma del Director sobre "Director" -- ver comentario en CertificateSignatureFooter. */
const SIGNATURE_MARK_HEIGHT = 68;

/** Párrafo compacto (interlineado y margen reducidos) para que los tres certificados quepan en una sola página A4. */
export const compactParagraph = [pdfStyles.paragraph, { lineHeight: 1.3, marginBottom: 5 }];
export const compactHeading = [pdfStyles.bold, { fontSize: 10.5, marginBottom: 3 }];

export function CertificateInstitutionalHeader({ title, year, profile }: { title: string; year: number; profile: InstitutionalProfile }) {
  const logoDataUri = getLogoDataUri();
  const info = profile.officialRecognition;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {logoDataUri ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML
          <Image src={logoDataUri} style={{ width: 52, height: 52, borderRadius: 8 }} />
        ) : (
          <View style={[pdfStyles.logoBox, { width: 52, height: 52 }]}>
            <Text style={pdfStyles.logoText}>PV</Text>
          </View>
        )}
        <View>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#213c30" }}>{profile.name.toUpperCase()}</Text>
          <Text style={{ fontSize: 8, color: "#5c6b66", marginTop: 2 }}>
            <Text style={pdfStyles.bold}>Región: </Text>
            {info.region}
          </Text>
          <Text style={{ fontSize: 8, color: "#5c6b66", marginTop: 0.5 }}>
            <Text style={pdfStyles.bold}>Provincia: </Text>
            {info.province}
          </Text>
          <Text style={{ fontSize: 8, color: "#5c6b66", marginTop: 0.5 }}>
            <Text style={pdfStyles.bold}>Comuna: </Text>
            {info.commune}
          </Text>
          <Text style={{ fontSize: 8, color: "#5c6b66", marginTop: 0.5 }}>
            <Text style={pdfStyles.bold}>RBD: </Text>
            {profile.rbd}
          </Text>
          <Text style={{ fontSize: 8, color: "#5c6b66", marginTop: 0.5 }}>
            <Text style={pdfStyles.bold}>Resolución RECOFI </Text>
            {info.recofi}
          </Text>
          <Text style={{ fontSize: 8, color: "#5c6b66", marginTop: 0.5 }}>
            <Text style={pdfStyles.bold}>Año Escolar: </Text>
            {year}
          </Text>
        </View>
      </View>

      <Text style={[pdfStyles.title, { fontSize: 14.5, marginTop: 8, marginBottom: 8 }]}>{title}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: -6, marginBottom: 8, color: "#325a38" }}>
        ENSEÑANZA BÁSICA
      </Text>
    </View>
  );
}

export function GradesWordsTable({
  rows,
  showWords,
  scoreColumnLabel = "Calificación final",
}: {
  rows: SubjectAverageRow[];
  showWords: boolean;
  scoreColumnLabel?: string;
}) {
  const cellPad = { padding: 3, fontSize: 8 };
  return (
    <View style={[pdfStyles.table, { marginTop: 8 }]}>
      <View style={pdfStyles.tableRowHeader}>
        <Text style={[pdfStyles.th, cellPad]}>Asignatura o Actividad de Aprendizaje</Text>
        <Text style={[pdfStyles.th, cellPad, { textAlign: "center", flex: showWords ? 0.55 : 0.4 }]}>{scoreColumnLabel}</Text>
        {showWords && <Text style={[pdfStyles.th, cellPad, { flex: 0.75 }]}>En palabras</Text>}
      </View>
      {rows.map((r) => (
        <View style={pdfStyles.tableRow} key={r.subjectName}>
          <Text style={[pdfStyles.td, cellPad]}>{r.subjectName}</Text>
          <Text style={[pdfStyles.tdCenter, cellPad, { flex: showWords ? 0.55 : 0.4 }]}>
            {r.average === null ? "—" : r.average.toFixed(1).replace(".", ",")}
          </Text>
          {showWords && <Text style={[pdfStyles.td, cellPad, { flex: 0.75 }]}>{gradeToWords(r.average)}</Text>}
        </View>
      ))}
    </View>
  );
}

export function CertificateSignatureFooter({
  homeroomTeacherName,
  issuedAt,
  folio,
  verificationCode,
  directorSignatureDataUri,
  profile,
}: {
  homeroomTeacherName: string | null;
  issuedAt: string;
  folio: string;
  verificationCode: string;
  /** Data URI de la firma escaneada del Director (ver getDirectorSignatureDataUri). Si es null, se muestra solo la línea de firma en blanco. */
  directorSignatureDataUri?: string | null;
  profile: InstitutionalProfile;
}) {
  return (
    <View wrap={false}>
      {/* alignItems "flex-start" (no el "flex-end" de pdfStyles.footerRow) + una zona reservada de la
          misma altura en ambos bloques antes del nombre: así "Profesor(a) Jefe" y "Director" quedan a
          la misma altura sin importar que el bloque del Director tenga una línea extra (nombre del
          establecimiento) debajo. SIGNATURE_MARK_HEIGHT ~= alto de la firma a 130pt de ancho con la
          proporción real del archivo (1672x941 -> ~73pt), con un pelo de margen. */}
      <View style={[pdfStyles.footerRow, { marginTop: 8, alignItems: "flex-start" }]}>
        <View style={pdfStyles.signatureBlock}>
          <View style={{ height: SIGNATURE_MARK_HEIGHT, width: "100%", justifyContent: "flex-end", alignItems: "center" }}>
            <View style={[pdfStyles.signatureLine, { marginTop: 0 }]} />
          </View>
          <Text style={pdfStyles.signatureName}>{homeroomTeacherName ?? "—"}</Text>
          <Text style={pdfStyles.signatureTitle}>Profesor(a) Jefe</Text>
        </View>
        <View style={pdfStyles.signatureBlock}>
          <View style={{ height: SIGNATURE_MARK_HEIGHT, width: "100%", justifyContent: "flex-end", alignItems: "center" }}>
            {directorSignatureDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML
              <Image src={directorSignatureDataUri} style={pdfStyles.directorSignatureImage} />
            ) : (
              <View style={[pdfStyles.signatureLine, { marginTop: 0 }]} />
            )}
          </View>
          <Text style={pdfStyles.signatureName}>{profile.director}</Text>
          <Text style={pdfStyles.signatureTitle}>{profile.directorTitle}</Text>
          <Text style={pdfStyles.signatureTitle}>{profile.name}</Text>
        </View>
      </View>

      <Text style={[pdfStyles.paragraph, { marginTop: 6, marginBottom: 3, lineHeight: 1.3 }]}>
        San Antonio, {formatDate(issuedAt, { day: "numeric", month: "long", year: "numeric" })}.
      </Text>

      <Text style={{ fontSize: 7.5, color: "#5c6b66", marginTop: 4 }}>Folio: {folio}</Text>
      <Text style={{ fontSize: 7.5, color: "#5c6b66", marginTop: 2 }}>Código de verificación: {verificationCode}</Text>

      <Text style={[pdfStyles.disclaimer, { marginTop: 6 }]}>
        Documento emitido electrónicamente por la plataforma institucional de la {profile.name}. Verifique su autenticidad en{" "}
        {SITE.domains.public}/verificar.
      </Text>
    </View>
  );
}
