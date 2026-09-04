"use client";

import { createClient } from "@/lib/supabase/client";

export const PUBLIC_BUCKET = "archivos-publicos";
export const PRIVATE_BUCKET = "archivos-internos";

export type FileKind = "document" | "image" | "signature" | "video" | "case_attachment" | "suspension_document" | "stamp" | "seguro_escolar_document";

export class FileValidationError extends Error {}

const MAX_SIZE_BYTES: Record<FileKind, number> = {
  document: 15 * 1024 * 1024, // 15 MB
  image: 5 * 1024 * 1024, // 5 MB
  signature: 2 * 1024 * 1024, // 2 MB -- imagen pequeña, escaneada
  // Coincide con el límite de video ya optimizado (ver lib/video/compressVideo.ts)
  // -- esta es la última barrera antes de Storage, no el límite que ve el usuario.
  video: 30 * 1024 * 1024,
  // Actas/documentos adjuntos de caso (Convivencia) -- puede ser un PDF
  // escaneado de varias páginas, mismo límite que "document".
  case_attachment: 15 * 1024 * 1024,
  // Documento/resolución de respaldo de una suspensión de clases -- mismo
  // límite y formatos que case_attachment.
  suspension_document: 15 * 1024 * 1024,
  // Seguro Escolar: formulario firmado escaneado, documentos del centro
  // asistencial, certificados -- mismo límite y formatos que case_attachment.
  seguro_escolar_document: 15 * 1024 * 1024,
  // Timbre institucional -- a diferencia de "signature", sí admite JPEG
  // (pedido explícito), aunque PNG con transparencia es lo preferido.
  stamp: 3 * 1024 * 1024,
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_MIME_BY_KIND: Record<FileKind, string[]> = {
  document: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/webp"],
  // Sin JPEG: una firma sin canal alfa se ve con fondo blanco/recuadro sobre el documento.
  signature: ["image/png", "image/webp"],
  // Solo MP4: el video que se sube aquí ya salió de compressVideo() como MP4/H.264.
  video: ["video/mp4"],
  case_attachment: ["application/pdf", DOCX_MIME, "image/jpeg", "image/png"],
  suspension_document: ["application/pdf", DOCX_MIME, "image/jpeg", "image/png"],
  seguro_escolar_document: ["application/pdf", "image/jpeg", "image/png"],
  stamp: ["image/png", "image/jpeg", "image/webp"],
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  [DOCX_MIME]: "docx",
};

/**
 * Detecta el tipo real del archivo leyendo sus primeros bytes (firma/"magic
 * number"), en vez de confiar en `file.type` o en la extensión del nombre
 * que reporta el navegador — ambos los controla quien sube el archivo.
 */
async function detectRealMimeType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
    return "application/pdf"; // %PDF
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return "image/png";
  }
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && // "RIFF"
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // "WEBP"
  ) {
    return "image/webp";
  }
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
    return "video/mp4"; // caja "ftyp" del contenedor MP4/ISO-BMFF (bytes 4-7)
  }
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    // Firma ZIP genérica ("PK\x03\x04") -- DOCX/XLSX/PPTX/ODT son todos
    // contenedores ZIP y comparten estos primeros bytes; no se puede
    // distinguir el subtipo exacto sin abrir el archivo. Igual que el resto
    // de esta función, es una barrera de "no es cualquier cosa con la
    // extensión cambiada", no un parser de formato completo.
    return DOCX_MIME;
  }
  return null;
}

async function validateFile(file: File, kind: FileKind): Promise<string> {
  const maxSize = MAX_SIZE_BYTES[kind];
  if (file.size > maxSize) {
    throw new FileValidationError(`El archivo supera el tamaño máximo permitido (${Math.round(maxSize / (1024 * 1024))} MB).`);
  }

  const realType = await detectRealMimeType(file);
  const allowed = ALLOWED_MIME_BY_KIND[kind];
  if (!realType || !allowed.includes(realType)) {
    const messages: Record<FileKind, string> = {
      document: "Solo se aceptan archivos PDF.",
      image: "Solo se aceptan imágenes JPG, PNG o WEBP.",
      signature: "Solo se aceptan imágenes PNG o WEBP (con fondo transparente).",
      video: "El video optimizado no es un MP4 válido.",
      case_attachment: "Solo se aceptan archivos PDF, DOCX, JPG o PNG.",
      suspension_document: "Solo se aceptan archivos PDF, DOCX, JPG o PNG.",
      stamp: "Solo se aceptan imágenes PNG, JPG, JPEG o WEBP.",
      seguro_escolar_document: "Solo se aceptan archivos PDF, JPG o PNG.",
    };
    throw new FileValidationError(messages[kind]);
  }

  return EXTENSION_BY_MIME[realType];
}

/** Ruta generada por el sistema — nunca el nombre original del archivo, evita colisiones y rutas maliciosas. */
function buildObjectPath(folder: string, extension: string): string {
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  return `${folder}/${unique}.${extension}`;
}

/** Sube a `archivos-publicos` (lectura pública) y devuelve la URL pública directa. */
export async function uploadPublicFile(folder: string, file: File, kind: FileKind): Promise<string> {
  const extension = await validateFile(file, kind);
  const path = buildObjectPath(folder, extension);
  const supabase = createClient();

  const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new FileValidationError(`No se pudo subir el archivo: ${error.message}`);

  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Sube a `archivos-internos` (sin lectura pública) y devuelve la RUTA interna, nunca una URL. */
export async function uploadPrivateFile(folder: string, file: File, kind: FileKind): Promise<string> {
  const extension = await validateFile(file, kind);
  const path = buildObjectPath(folder, extension);
  const supabase = createClient();

  const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new FileValidationError(`No se pudo subir el archivo: ${error.message}`);

  return path;
}

/** Genera una URL firmada de corta duración para un archivo de `archivos-internos`. */
export async function getSignedUrl(path: string, expiresInSeconds = 60): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deletePublicFile(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(PUBLIC_BUCKET).remove([path]);
}

export async function deletePrivateFile(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
}

/** Extrae la ruta del objeto a partir de una URL pública de `archivos-publicos` (para poder borrarlo). */
export function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${PUBLIC_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}
