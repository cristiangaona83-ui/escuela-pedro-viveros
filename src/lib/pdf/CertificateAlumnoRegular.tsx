import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { getLogoDataUri } from "./DocumentHeader";
import { SITE } from "@/config/site";
import { formatDate, formatRun } from "@/lib/utils";

/**
 * Certificado de Alumno Regular -- documento formal para trámites
 * oficiales. Usa un encabezado institucional propio (más completo que el
 * `DocumentHeader` compartido: incluye RBD y la dirección en dos líneas)
 * en vez de reutilizar `<DocumentHeader>` tal cual, para no alterar el
 * encabezado del resto de los documentos de la plataforma. Sí reutiliza
 * `getLogoDataUri()` -- el logo institucional sigue siendo uno solo.
 */
export function CertificateAlumnoRegular({
  folio,
  studentName,
  studentRun,
  courseLabel,
  year,
  issuedAt,
  signatureName,
  signatureTitle,
  qrDataUrl,
  verificationCode,
  directorSignatureDataUri,
}: {
  folio: string;
  studentName: string;
  studentRun: string;
  courseLabel: string;
  year: number;
  issuedAt: string;
  signatureName: string;
  signatureTitle: string;
  qrDataUrl: string;
  verificationCode: string;
  /** Data URI de la firma escaneada del Director (ver getDirectorSignatureDataUri). Si es null, se muestra solo la línea de firma en blanco. */
  directorSignatureDataUri?: string | null;
}) {
  const logoDataUri = getLogoDataUri();
  // SITE.address.city ya viene como "Llolleo, San Antonio" (para el
  // encabezado y el resto del sitio); el cuerpo del certificado nombra la
  // comuna aparte ("comuna de San Antonio"), así que aquí solo se usa la
  // localidad.
  const locality = SITE.address.city.split(",")[0].trim();
  const resolvedSignatureName = signatureName || SITE.director;
  // La firma escaneada es la del Director -- si school_config tiene configurado un firmante distinto, se omite la imagen para no atribuirle una firma que no es la suya.
  const showDirectorSignatureImage = Boolean(directorSignatureDataUri) && resolvedSignatureName === SITE.director;

  return (
    <Document title={`Certificado de Alumno Regular - ${studentName}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {logoDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML
              <Image src={logoDataUri} style={{ width: 56, height: 56, borderRadius: 8 }} />
            ) : (
              <View style={[pdfStyles.logoBox, { width: 56, height: 56 }]}>
                <Text style={pdfStyles.logoText}>PV</Text>
              </View>
            )}
            <View>
              <Text style={{ fontSize: 11.5, fontFamily: "Helvetica-Bold", color: "#213c30" }}>{SITE.name.toUpperCase()}</Text>
              <Text style={{ fontSize: 8.5, color: "#5c6b66", marginTop: 3 }}>RBD {SITE.rbd}</Text>
              <Text style={{ fontSize: 8.5, color: "#5c6b66", marginTop: 1 }}>
                {SITE.address.street}, {SITE.address.neighborhood}, {SITE.address.city}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#5c6b66", marginTop: 1 }}>{SITE.address.region}</Text>
            </View>
          </View>
          <Text style={pdfStyles.folio}>Folio {folio}</Text>
        </View>

        <Text style={pdfStyles.title}>CERTIFICADO DE ALUMNO REGULAR</Text>

        <Text style={pdfStyles.paragraph}>
          La {SITE.name}, RBD {SITE.rbd}, ubicada en {SITE.address.street}, {SITE.address.neighborhood}, {locality}, comuna de San
          Antonio, {SITE.address.region}, certifica que{" "}
          <Text style={pdfStyles.bold}>{studentName}</Text>, RUN <Text style={pdfStyles.bold}>{formatRun(studentRun)}</Text>, registra
          matrícula vigente y la calidad de estudiante regular en {courseLabel}, durante el año académico {year}.
        </Text>

        <Text style={pdfStyles.paragraph}>
          Se extiende el presente certificado a petición de la persona interesada, para los fines que estime pertinentes.
        </Text>

        <Text style={pdfStyles.paragraph}>San Antonio, {formatDate(issuedAt, { day: "numeric", month: "long", year: "numeric" })}.</Text>

        <View style={pdfStyles.footerRow}>
          <View style={pdfStyles.signatureBlock}>
            {showDirectorSignatureImage ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML
              <Image src={directorSignatureDataUri!} style={[pdfStyles.directorSignatureImage, { marginTop: 4 }]} />
            ) : (
              <View style={pdfStyles.signatureLine} />
            )}
            <Text style={pdfStyles.signatureName}>{resolvedSignatureName}</Text>
            <Text style={pdfStyles.signatureTitle}>{signatureTitle || "Director"}</Text>
            <Text style={pdfStyles.signatureTitle}>{SITE.name}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML */}
            {qrDataUrl && <Image src={qrDataUrl} style={pdfStyles.qr} />}
            <Text style={{ fontSize: 7, color: "#8a938f", marginTop: 4 }}>Verificar autenticidad</Text>
          </View>
        </View>

        <Text style={pdfStyles.disclaimer}>
          Folio: {folio} · Documento emitido por la plataforma pedagógica del establecimiento. Verifique su autenticidad en{" "}
          {SITE.domains.public}/verificar con el código:
        </Text>
        <Text style={pdfStyles.verificationCode}>{verificationCode}</Text>
      </Page>
    </Document>
  );
}
