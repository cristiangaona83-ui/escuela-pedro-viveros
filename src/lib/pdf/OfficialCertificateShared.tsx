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

/** Una asignatura vinculada a otra (ej. un Taller vinculado a Lenguaje, ver
 * 0053_subjects_linked_subject.sql) -- su nota NO es una fila más de
 * `SubjectAverageRow`: ya fue absorbida en el promedio de `linkedToName`
 * (ver buildSubjectReport en services/report-data.ts). Se reporta aparte
 * solo para el apartado "Talleres complementarios" del certificado. */
export interface LinkedSubjectRow {
  subjectName: string;
  average: number | null;
  linkedToName: string;
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
const SIGNATURE_MARK_HEIGHT = 100;

/** Ancho de la firma del Director cuando va sola vs. cuando va acompañada del timbre (se angosta un poco para que la fila quepa dentro de signatureBlock sin salirse). */
const DIRECTOR_SIGNATURE_WIDTH_WITH_STAMP = 120;
const STAMP_SIZE = 60;
const SIGNATURE_ROW_GAP = 6;

/** Ancho de la línea bajo la firma en cada variante -- ancho fijo (no "100%") a propósito, ver comentario de más abajo. */
const NO_STAMP_LINE_WIDTH = pdfStyles.directorSignatureImage.width as number;
const WITH_STAMP_LINE_WIDTH = DIRECTOR_SIGNATURE_WIDTH_WITH_STAMP + SIGNATURE_ROW_GAP + STAMP_SIZE;

/**
 * Firma del Director + timbre institucional, uno al lado del otro (firma a
 * la izquierda, timbre a la derecha -- nunca debajo). Componente central:
 * se usa en todos los documentos que hoy muestran la firma del Director
 * (CertificateSignatureFooter más abajo, CertificateAlumnoRegular.tsx y
 * SeguroEscolarInstitutionalDocument.tsx), así que agregar el timbre acá
 * se propaga a todos ellos sin tocarlos uno por uno.
 *
 * Reglas de "nunca romper el documento":
 *  - Siempre hay línea (con firma, sin firma, con o sin timbre) -- mismo
 *    `pdfStyles.signatureLine`, igual que el bloque del Profesor(a) Jefe.
 *  - El ancho de la línea SIEMPRE se pasa como número fijo (nunca
 *    `width: "100%"`): este componente se usa dentro de contenedores con
 *    `alignItems: "center"` (no "stretch") en CertificateAlumnoRegular.tsx y
 *    SeguroEscolarInstitutionalDocument.tsx, y ahí una vista sin ancho propio
 *    se autoajusta a su contenido en vez de heredar el ancho del padre -- un
 *    hijo con `width: "100%"` resuelve contra un ancho todavía indefinido y
 *    termina invisible (ancho 0, bug real que tenían ambos documentos). Por
 *    defecto usa `NO_STAMP_LINE_WIDTH` / `WITH_STAMP_LINE_WIDTH` (el ancho
 *    de la firma/timbre); `lineStyle.width` permite pasar otro número --
 *    CertificateSignatureFooter pasa `pdfStyles.signatureBlock.width` para
 *    que combine con el ancho real del bloque del Profesor(a) Jefe al lado.
 *  - Con firma y timbre: fila horizontal, timbre con `objectFit: "contain"`
 *    (no se deforma, mantiene proporción) en una caja fija -- nunca tapa la
 *    firma ni el texto de abajo (nombre/cargo, fuera de esta función).
 *  - El timbre NUNCA se muestra sin firma (evita un timbre "flotante" sin
 *    firma real sobre él, que no es un diseño válido).
 */
export function DirectorSignatureImage({
  directorSignatureDataUri,
  stampDataUri,
  lineStyle,
}: {
  directorSignatureDataUri?: string | null;
  stampDataUri?: string | null;
  /** Override puntual de la línea -- CertificateSignatureFooter pasa marginTop:0 y width:pdfStyles.signatureBlock.width. */
  lineStyle?: { marginTop?: number; width?: number };
}) {
  if (!directorSignatureDataUri) {
    return <View style={{ ...pdfStyles.signatureLine, width: NO_STAMP_LINE_WIDTH, ...lineStyle }} />;
  }
  if (!stampDataUri) {
    return (
      <View style={{ alignItems: "center" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML */}
        <Image src={directorSignatureDataUri} style={pdfStyles.directorSignatureImage} />
        <View style={{ ...pdfStyles.signatureLine, marginTop: 4, width: NO_STAMP_LINE_WIDTH, ...lineStyle }} />
      </View>
    );
  }
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: SIGNATURE_ROW_GAP }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML */}
        <Image src={directorSignatureDataUri} style={{ width: DIRECTOR_SIGNATURE_WIDTH_WITH_STAMP, alignSelf: "center" }} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML */}
        <Image src={stampDataUri} style={{ width: STAMP_SIZE, height: STAMP_SIZE, objectFit: "contain" }} />
      </View>
      <View style={{ ...pdfStyles.signatureLine, marginTop: 4, width: WITH_STAMP_LINE_WIDTH, ...lineStyle }} />
    </View>
  );
}

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

/**
 * Tabla de asignaturas + Promedio General/Porcentaje de Asistencia -- una
 * sola tabla (un solo recuadro), como en el certificado oficial de
 * referencia: el promedio y la asistencia van al final de la MISMA tabla,
 * no en un cuadro aparte, separados de las asignaturas solo por un borde
 * superior más marcado. El encabezado "Calificación" y los valores debajo
 * (notas, promedio, asistencia) van todos centrados -- misma alineación en
 * encabezado y valores, para que toda la columna quede justo debajo del
 * título, al medio.
 */
export function GradesWordsTable({
  rows,
  summaryRows,
  showWords,
  scoreColumnLabel = "Calificación final",
}: {
  rows: SubjectAverageRow[];
  /** Filas de resumen (Promedio General, Porcentaje de Asistencia) al final de la misma tabla. */
  summaryRows?: { label: string; value: string; words?: string }[];
  showWords: boolean;
  scoreColumnLabel?: string;
}) {
  const cellPad = { padding: 3, fontSize: 8 };
  const scoreFlex = showWords ? 0.55 : 0.4;
  return (
    <View style={[pdfStyles.table, { marginTop: 8 }]}>
      <View style={pdfStyles.tableRowHeader}>
        <Text style={[pdfStyles.th, cellPad]}>Asignatura o Actividad de Aprendizaje</Text>
        <Text style={[pdfStyles.th, cellPad, { textAlign: "center", flex: scoreFlex }]}>{scoreColumnLabel}</Text>
        {showWords && <Text style={[pdfStyles.th, cellPad, { flex: 0.75 }]}>En palabras</Text>}
      </View>
      {rows.map((r) => (
        <View style={pdfStyles.tableRow} key={r.subjectName}>
          <Text style={[pdfStyles.td, cellPad]}>{r.subjectName}</Text>
          <Text style={[pdfStyles.tdCenter, cellPad, { flex: scoreFlex }]}>
            {r.average === null ? "—" : r.average.toFixed(1).replace(".", ",")}
          </Text>
          {showWords && <Text style={[pdfStyles.td, cellPad, { flex: 0.75 }]}>{gradeToWords(r.average)}</Text>}
        </View>
      ))}
      {summaryRows?.map((r, i) => (
        <View style={i === 0 ? [pdfStyles.tableRow, { borderTopWidth: 1, borderTopColor: "#1c2624" }] : pdfStyles.tableRow} key={r.label}>
          <Text style={[pdfStyles.td, cellPad, pdfStyles.bold]}>{r.label}</Text>
          <Text style={[pdfStyles.tdCenter, cellPad, { flex: scoreFlex }]}>{r.value}</Text>
          {showWords && <Text style={[pdfStyles.td, cellPad, { flex: 0.75 }]}>{r.words ?? ""}</Text>}
        </View>
      ))}
    </View>
  );
}

/**
 * Apartado "Talleres complementarios" -- lista los Talleres vinculados a una
 * asignatura troncal (ver `linked_subject_id`, 0053_subjects_linked_subject.sql)
 * con su propio promedio, aclarando a qué asignatura fue incorporada esa nota.
 * No se muestra nada (ni el título) cuando no hay Talleres vinculados, para
 * no alterar el certificado de cursos que no los usan.
 *
 * `showWords` debe ser el mismo valor que recibió `GradesWordsTable` en el
 * mismo certificado -- así la columna "Calificación" usa exactamente el
 * mismo ancho (flex) en ambas tablas y el número queda alineado bajo la
 * columna de notas de la tabla principal, en vez de quedar corrido.
 */
export function LinkedSubjectsNote({ rows, showWords }: { rows: LinkedSubjectRow[]; showWords: boolean }) {
  if (rows.length === 0) return null;
  const cellPad = { padding: 3, fontSize: 8 };
  const scoreFlex = showWords ? 0.55 : 0.4;
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={compactHeading}>Talleres complementarios</Text>
      <View style={[pdfStyles.table, { marginTop: 2 }]}>
        <View style={pdfStyles.tableRowHeader}>
          <Text style={[pdfStyles.th, cellPad]}>Taller</Text>
          <Text style={[pdfStyles.th, cellPad, { textAlign: "center", flex: scoreFlex }]}>Calificación</Text>
          {showWords && <Text style={[pdfStyles.th, cellPad, { flex: 0.75 }]}>Incorporada al promedio de</Text>}
        </View>
        {rows.map((r) => (
          <View style={pdfStyles.tableRow} key={r.subjectName}>
            <Text style={[pdfStyles.td, cellPad]}>
              {showWords ? r.subjectName : `${r.subjectName} (vinculado a ${r.linkedToName})`}
            </Text>
            <Text style={[pdfStyles.tdCenter, cellPad, { flex: scoreFlex }]}>
              {r.average === null ? "—" : r.average.toFixed(1).replace(".", ",")}
            </Text>
            {showWords && <Text style={[pdfStyles.td, cellPad, { flex: 0.75 }]}>{r.linkedToName}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

export function CertificateSignatureFooter({
  homeroomTeacherName,
  issuedAt,
  folio,
  verificationCode,
  directorSignatureDataUri,
  stampDataUri,
  profile,
}: {
  homeroomTeacherName: string | null;
  issuedAt: string;
  folio: string;
  verificationCode: string;
  /** Data URI de la firma escaneada del Director (ver getDirectorSignatureDataUri). Si es null, se muestra solo la línea de firma en blanco. */
  directorSignatureDataUri?: string | null;
  /** Data URI del timbre institucional (ver getInstitutionalStampDataUri). Si es null, se ve exactamente igual que antes. */
  stampDataUri?: string | null;
  profile: InstitutionalProfile;
}) {
  return (
    <View wrap={false}>
      {/* alignItems "flex-start" (no el "flex-end" de pdfStyles.footerRow) + una zona reservada de la
          misma altura en ambos bloques antes del nombre: así "Profesor(a) Jefe" y "Director" quedan a
          la misma altura sin importar que el bloque del Director tenga una línea extra (nombre del
          establecimiento) debajo. SIGNATURE_MARK_HEIGHT ~= alto de la firma sin timbre (la más alta de
          las dos variantes) a pdfStyles.directorSignatureImage.width con la proporción real del
          archivo (1672x941), más la línea que va debajo de la firma (ver DirectorSignatureImage), con
          un pelo de margen. */}
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
            <DirectorSignatureImage
              directorSignatureDataUri={directorSignatureDataUri}
              stampDataUri={stampDataUri}
              lineStyle={{ marginTop: 0, width: pdfStyles.signatureBlock.width }}
            />
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
