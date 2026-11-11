import { SITE } from "@/config/site";
import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { getInstitutionalProfile } from "@/services/school-config";
import { toPdfImageDataUri } from "@/lib/pdf/director-signature";
import { getHomeroomTeacherName } from "@/services/students";
import type { ParvulariaReportContext } from "@/lib/pdf/ParvulariaReportDocument";

/** Datos institucionales y firmas comunes a todas las hojas de un informe de Educación Parvularia (un curso). */
export async function getParvulariaReportContext(courseId: string): Promise<ParvulariaReportContext> {
  const [profile, homeroomTeacherName, rawSignature, rawStamp] = await Promise.all([
    getInstitutionalProfile(),
    getHomeroomTeacherName(courseId),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
  ]);
  // Misma normalización que informativos/circulares: PNG/JPEG reales, WEBP convertido a PNG.
  const [directorSignatureDataUri, stampDataUri] = await Promise.all([
    toPdfImageDataUri(rawSignature, "la firma"),
    toPdfImageDataUri(rawStamp, "el timbre"),
  ]);
  return {
    establishmentName: profile.name,
    rbd: SITE.rbd,
    homeroomTeacherName,
    directorName: profile.director,
    directorTitle: profile.directorTitle,
    directorSignatureDataUri,
    stampDataUri,
  };
}
