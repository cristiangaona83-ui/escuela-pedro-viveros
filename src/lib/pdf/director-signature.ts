import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { getInstitutionalProfile } from "@/services/school-config";

/** Firma (y timbre, opcional) del Director junto con su nombre y cargo impresos. */
export interface DirectorSignature {
  directorName: string;
  directorTitle: string;
  /** Siempre data:image/png o data:image/jpeg -- lo único que soportan react-pdf y pdf-lib. */
  signatureDataUri: string;
  stampDataUri?: string | null;
}

/**
 * Deja la imagen como PNG/JPEG de verdad, mirando los bytes (el content-type
 * que devuelve Storage no es confiable). WEBP -- que la firma y el timbre
 * admiten al subirse -- se convierte a PNG; cualquier otra cosa devuelve null.
 */
async function toPdfImageDataUri(dataUri: string | null, label: string): Promise<string | null> {
  if (!dataUri) return null;
  const match = /^data:[^;,]*;base64,(.+)$/.exec(dataUri);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");

  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  }
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    try {
      const sharp = (await import("sharp")).default;
      const png = await sharp(bytes).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    } catch (err) {
      console.error(`[director-signature] no se pudo convertir ${label} de WEBP a PNG`, err);
      return null;
    }
  }
  console.error(`[director-signature] ${label} no es PNG, JPEG ni WEBP`);
  return null;
}

/**
 * Firma y timbre del Director para cerrar un informativo o una circular.
 * Mismo criterio que los certificados ("nunca romper el PDF"): sin firma
 * activa devuelve null y el documento sale igual que antes, sin firma. El
 * timbre nunca va sin firma.
 */
export async function getDirectorSignature(): Promise<DirectorSignature | null> {
  const [profile, rawSignature, rawStamp] = await Promise.all([
    getInstitutionalProfile(),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
  ]);
  if (!rawSignature) {
    console.error("[director-signature] no hay firma activa del Director (o no se pudo descargar)");
    return null;
  }
  const [signatureDataUri, stampDataUri] = await Promise.all([
    toPdfImageDataUri(rawSignature, "la firma"),
    toPdfImageDataUri(rawStamp, "el timbre"),
  ]);
  if (!signatureDataUri) return null;
  return { directorName: profile.director, directorTitle: profile.directorTitle, signatureDataUri, stampDataUri };
}
