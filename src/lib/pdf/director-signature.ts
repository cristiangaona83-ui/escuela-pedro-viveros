import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { getInstitutionalProfile } from "@/services/school-config";

/** Firma (y timbre, opcional) del Director junto con su nombre y cargo impresos. */
export interface DirectorSignature {
  directorName: string;
  directorTitle: string;
  signatureDataUri: string;
  stampDataUri?: string | null;
}

/**
 * Firma y timbre del Director para cerrar un informativo o una circular.
 * Mismo criterio que los certificados ("nunca romper el PDF"): sin firma
 * activa devuelve null y el documento sale igual que antes, sin firma. El
 * timbre nunca va sin firma.
 */
export async function getDirectorSignature(): Promise<DirectorSignature | null> {
  const [profile, signatureDataUri, stampDataUri] = await Promise.all([
    getInstitutionalProfile(),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
  ]);
  if (!signatureDataUri) return null;
  return { directorName: profile.director, directorTitle: profile.directorTitle, signatureDataUri, stampDataUri };
}
