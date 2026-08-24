import { existsSync } from "node:fs";
import { join } from "node:path";

/** Existencia real de una fotografía institucional en public/ — server-only
 * (usa node:fs). Así las tarjetas de equipo muestran la foto en cuanto se
 * coloque el archivo, sin depender de un fallback en el navegador. */
export function photoExists(photoSrc: string): boolean {
  return existsSync(join(process.cwd(), "public", photoSrc));
}

/** Resuelve la fotografía a mostrar para una persona a partir del único
 * campo `photo_url` de staff_members, con la prioridad:
 * foto Supabase Storage → foto local ya publicada → avatar con iniciales.
 * `photo_url` puede contener una URL absoluta de Supabase Storage (subida
 * desde la Plataforma) o una ruta local heredada (`/images/staff/...`,
 * sembrada por la migración) — se distingue por el prefijo http(s). */
export function resolveStaffPhoto(photoUrl: string | null | undefined): { src: string; hasPhoto: boolean } {
  if (!photoUrl) return { src: "", hasPhoto: false };
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return { src: photoUrl, hasPhoto: true };
  }
  return { src: photoUrl, hasPhoto: photoExists(photoUrl) };
}
