import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "@/types/database";
import type { DirectorSignature } from "@/lib/pdf/director-signature";

const BUCKET = "archivos-publicos";

/**
 * Copias públicas (PNG) de la firma y el timbre del Director para la página
 * web del informativo. Los originales viven en un bucket privado, así que la
 * página pública (anónima) no puede leerlos; al publicar se deja esta copia
 * junto al PDF. No expone nada nuevo: la misma imagen ya va incrustada en el
 * PDF público que cualquiera puede descargar.
 */
export function bulletinSignaturePaths(bulletinId: string) {
  return { signature: `informativos/${bulletinId}-firma.png`, stamp: `informativos/${bulletinId}-timbre.png` };
}

function toBuffer(dataUri: string): Buffer {
  return Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64");
}

/** Sube (o retira, si ya no hay firma) las copias públicas. Nunca interrumpe la publicación: ante un error solo lo registra. */
export async function syncBulletinSignatureAssets(
  supabase: SupabaseClient<Database>,
  bulletinId: string,
  signature: DirectorSignature | null
) {
  const paths = bulletinSignaturePaths(bulletinId);
  try {
    const upload = async (path: string, dataUri: string) => {
      const png = await sharp(toBuffer(dataUri)).png().toBuffer();
      const { error } = await supabase.storage.from(BUCKET).upload(path, png, { upsert: true, cacheControl: "0", contentType: "image/png" });
      if (error) throw error;
    };
    if (!signature) {
      await supabase.storage.from(BUCKET).remove([paths.signature, paths.stamp]);
      return;
    }
    await upload(paths.signature, signature.signatureDataUri);
    if (signature.stampDataUri) await upload(paths.stamp, signature.stampDataUri);
    else await supabase.storage.from(BUCKET).remove([paths.stamp]);
  } catch (err) {
    console.error("[informativos] no se pudo actualizar la copia pública de la firma", err);
  }
}
