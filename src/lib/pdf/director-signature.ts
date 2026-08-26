import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const SIGNATURE_BUCKET = "archivos-internos";
const SIGNATURE_PATH = "firmas/firma-director.png";

/**
 * Descarga la firma escaneada del Director desde el bucket PRIVADO
 * `archivos-internos` de Supabase Storage (el mismo bucket privado que ya
 * usa `src/lib/supabase/storage.ts` como `PRIVATE_BUCKET` -- no
 * `archivos-publicos`) y la entrega como Data URI lista para incrustar en
 * un PDF con `@react-pdf/renderer`. La descarga
 * ocurre siempre en el servidor (service_role, omite RLS); el archivo nunca
 * se sirve como URL pública ni firmada -- solo salen del servidor los bytes
 * del PDF ya renderizado, con la firma incrustada como imagen embebida.
 *
 * Si el bucket, el archivo o las credenciales de servicio no están
 * disponibles, devuelve `null` en vez de lanzar: los certificados deben
 * poder emitirse igual (sin la imagen de firma) aunque este paso falle.
 */
export async function getDirectorSignatureDataUri(): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(SIGNATURE_PATH);
    if (error || !data) {
      console.error("[director-signature] No se pudo descargar la firma del Director", {
        message: error?.message,
      });
      return null;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length === 0) return null;

    const contentType = data.type && data.type.startsWith("image/") ? data.type : "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("[director-signature] Error inesperado obteniendo la firma del Director", err);
    return null;
  }
}
