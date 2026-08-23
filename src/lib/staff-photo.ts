import { existsSync } from "node:fs";
import { join } from "node:path";

/** Existencia real de una fotografía institucional en public/ — server-only
 * (usa node:fs). Así las tarjetas de Equipo Directivo y Equipo PIE muestran
 * la foto en cuanto se coloque el archivo, sin depender de un fallback en
 * el navegador. */
export function photoExists(photoSrc: string): boolean {
  return existsSync(join(process.cwd(), "public", photoSrc));
}
