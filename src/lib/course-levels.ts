// Orden pedagógico real (Prekínder → 8° Básico). `level` es texto libre en
// courses, así que el orden alfabético no sirve ("Kínder" quedaría antes que
// "Prekínder"). Cursos con un `level` fuera de esta lista (p. ej. Educación
// Media, si se agrega en el futuro) se muestran al final, sin excluirse.
export const COURSE_LEVEL_ORDER = [
  "Prekínder",
  "Kínder",
  "1° Básico",
  "2° Básico",
  "3° Básico",
  "4° Básico",
  "5° Básico",
  "6° Básico",
  "7° Básico",
  "8° Básico",
];

export function levelSortIndex(level: string): number {
  const idx = COURSE_LEVEL_ORDER.indexOf(level);
  return idx === -1 ? COURSE_LEVEL_ORDER.length : idx;
}

/** Último nivel del colegio: quienes lo terminan egresan. */
export const LAST_LEVEL = "8° Básico";

/**
 * Nivel al que pasa quien aprueba `level` ("Prekínder" → "Kínder" → "1° Básico"
 * ...). null si es el último nivel (egresa) o si el nivel no es reconocido.
 */
export function nextLevel(level: string): string | null {
  const idx = COURSE_LEVEL_ORDER.indexOf(level);
  if (idx === -1 || idx >= COURSE_LEVEL_ORDER.length - 1) return null;
  return COURSE_LEVEL_ORDER[idx + 1];
}

export function isKnownLevel(level: string): boolean {
  return COURSE_LEVEL_ORDER.includes(level);
}
