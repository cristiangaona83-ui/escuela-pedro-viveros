import type { JSONContent } from "@tiptap/core";
import { isBulletinImageUrl } from "@/lib/bulletin-content";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const PDF_SUPPORTED_TYPES = ["image/png", "image/jpeg"];

/** react-pdf no soporta WEBP ni descarga con tolerancia a fallos: se baja cada imagen acá, solo desde nuestro propio Storage (nunca un host arbitrario). */
function isOwnStorageUrl(value: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    return new URL(value).host === new URL(base).host;
  } catch {
    return false;
  }
}

async function toDataUri(url: string): Promise<string | null> {
  if (!isBulletinImageUrl(url) || !isOwnStorageUrl(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!PDF_SUPPORTED_TYPES.includes(type)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Devuelve una copia del contenido del informativo con cada imagen reemplazada
 * por su data URI -- así el PDF no depende de que react-pdf descargue nada, y
 * una imagen que ya no existe (o no se puede descargar) se omite en vez de
 * hacer fallar la generación completa del PDF al publicar.
 */
export async function inlineBulletinImages(content: JSONContent): Promise<JSONContent> {
  async function walk(node: JSONContent): Promise<JSONContent | null> {
    if (node.type === "image") {
      const dataUri = await toDataUri(String(node.attrs?.src ?? ""));
      if (!dataUri) {
        console.error("[informativos] imagen omitida del PDF (no se pudo descargar)", { src: node.attrs?.src });
        return null;
      }
      return { ...node, attrs: { ...node.attrs, src: dataUri } };
    }
    if (!node.content) return node;
    const children = (await Promise.all(node.content.map(walk))).filter((c): c is JSONContent => c !== null);
    return { ...node, content: children };
  }
  return (await walk(content)) ?? content;
}
