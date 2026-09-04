/**
 * Utilidades puras del Seguro Escolar -- sin ningún import de
 * `@/lib/supabase/server` ni de otro módulo server-only. Se usan tanto
 * desde `src/services/seguro-escolar.ts` (servidor) como directamente
 * desde componentes cliente (formularios, tabla) -- si estas funciones
 * vivieran en el servicio de servidor, cualquier componente cliente que
 * importara una sola de ellas arrastraría also `next/headers` al bundle
 * del navegador y rompería el build (ya pasó una vez al construir este
 * módulo: Next.js rechaza que un Client Component dependa, aunque sea
 * transitivamente, de un módulo que usa `next/headers`).
 */

/** Codificación oficial del formulario 0374-3: Lunes=1 ... Domingo=7. */
export function accidentWeekday(accidentDateIso: string): number {
  const [y, m, d] = accidentDateIso.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=domingo..6=sábado
  return jsDay === 0 ? 7 : jsDay;
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo",
};

export function formatFolio(year: number, number: number): string {
  return String(number).padStart(6, "0");
}

/** Divide un apellido combinado en paterno/materno lo mejor posible (primera
 * palabra = paterno, resto = materno) -- solo como valor inicial editable.
 * Nunca se asume correcto: el formulario permite corregirlo a mano. */
export function splitLastNames(lastNames: string): { paterno: string; materno: string } {
  const parts = lastNames.trim().split(/\s+/);
  if (parts.length <= 1) return { paterno: parts[0] ?? "", materno: "" };
  return { paterno: parts[0], materno: parts.slice(1).join(" ") };
}
