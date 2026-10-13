import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getDirectorSignature } from "@/lib/pdf/director-signature";
import { stampCircularPdf, type CircularStampMode } from "@/lib/pdf/stamp-circular";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;
const BUCKET = "archivos-publicos";
const FOLDER = "circulares-informativas";
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/${FOLDER}/`;
const MAX_BYTES = 15 * 1024 * 1024;

/** Ruta del objeto dentro del bucket a partir de su URL pública -- solo si es una circular de NUESTRO Storage. */
function storagePathFromUrl(fileUrl: unknown): string | null {
  if (typeof fileUrl !== "string") return null;
  try {
    const url = new URL(fileUrl);
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base || url.host !== new URL(base).host || url.protocol !== "https:") return null;
    if (!url.pathname.startsWith(PUBLIC_PREFIX)) return null;
    return decodeURIComponent(url.pathname.slice(`/storage/v1/object/public/${BUCKET}/`.length));
  } catch {
    return null;
  }
}

/**
 * Agrega la firma y el timbre del Director a una circular recién subida.
 * El navegador sube el PDF original directo a Storage (los PDF pueden pesar
 * hasta 15 MB, más que el límite de cuerpo de una función de Vercel), y
 * después llama acá con su URL: se descarga, se estampa y se guarda como un
 * archivo nuevo (ruta única), borrando el original sin firma.
 *
 * Respuesta: { fileUrl, mode } -- `mode` es "above-name" (arriba del nombre
 * impreso del Director), "appended-page" (hoja final, si no se encontró el
 * nombre) o "none" (no hay firma institucional configurada: el archivo queda
 * tal cual, sin firma).
 */
export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para publicar circulares" }, { status: 403 });
  }

  const { fileUrl } = await request.json().catch(() => ({ fileUrl: null }));
  const path = storagePathFromUrl(fileUrl);
  if (!path) return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });

  const supabase = await createClient();
  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
  if (downloadError || !blob) return NextResponse.json({ error: "No se pudo leer el archivo subido" }, { status: 502 });
  if (blob.size > MAX_BYTES) return NextResponse.json({ error: "El archivo supera los 15 MB" }, { status: 400 });
  const original = new Uint8Array(await blob.arrayBuffer());
  if (!(original[0] === 0x25 && original[1] === 0x50 && original[2] === 0x44 && original[3] === 0x46)) {
    return NextResponse.json({ error: "El archivo no es un PDF" }, { status: 400 });
  }

  const signature = await getDirectorSignature();
  let stamped: { bytes: Uint8Array; mode: CircularStampMode } | null = null;
  if (signature) {
    try {
      stamped = await stampCircularPdf(original, signature);
    } catch (err) {
      console.error("[circulares/firmar] error al estampar", err);
      return NextResponse.json({ error: "No se pudo agregar la firma y el timbre al PDF" }, { status: 500 });
    }
  }
  if (!stamped) return NextResponse.json({ fileUrl, mode: "none" as const });

  const newPath = `${FOLDER}/${Date.now()}-${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, stamped.bytes, {
    cacheControl: "3600",
    upsert: false,
    contentType: "application/pdf",
  });
  if (uploadError) {
    console.error("[circulares/firmar] error al subir el PDF firmado", { message: uploadError.message });
    return NextResponse.json({ error: "No se pudo guardar el PDF firmado" }, { status: 500 });
  }

  await supabase.storage.from(BUCKET).remove([path]);
  const signedUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
  return NextResponse.json({ fileUrl: signedUrl, mode: stamped.mode });
}
