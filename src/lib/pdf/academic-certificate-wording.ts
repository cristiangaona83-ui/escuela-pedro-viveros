/**
 * Conversión de calificaciones y nombres de curso al lenguaje formal
 * requerido por los certificados académicos oficiales (Anual, Semestral,
 * Cierre de Año Escolar) -- únicamente usado por esos documentos.
 */

const UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

/** 6.1 -> "seis coma uno". Solo escala 1.0-7.0 con un decimal (la usada por el establecimiento). */
export function gradeToWords(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value * 10) / 10;
  const [intPart, decPart = "0"] = rounded.toFixed(1).split(".");
  const intWord = UNITS[Number(intPart)] ?? intPart;
  const decWord = UNITS[Number(decPart)] ?? decPart;
  return `${intWord} coma ${decWord}`;
}

const BASICA_ORDINALS = ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo"];

/** "5° Básico" -> 5. Solo reconoce niveles de Enseñanza Básica (1° a 8°). */
function basicaGrade(level: string): number | null {
  const match = level.match(/^(\d)°?\s*Básico$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= 8 ? n : null;
}

/** true solo para "1° Básico".."8° Básico" -- los certificados oficiales de este documento son exclusivos de Enseñanza Básica. */
export function isEnsenanzaBasica(level: string): boolean {
  return basicaGrade(level) !== null;
}

/**
 * "5° Básico", "A" -> "Quinto Año A de Enseñanza Básica".
 * Sin letra (curso siguiente, todavía sin paralelo asignado) -> "Quinto Año de Enseñanza Básica".
 */
export function formalCourseName(level: string, letter?: string | null): string {
  const grade = basicaGrade(level);
  if (grade === null) return level;
  const ordinal = BASICA_ORDINALS[grade - 1];
  return letter ? `${ordinal} Año ${letter} de Enseñanza Básica` : `${ordinal} Año de Enseñanza Básica`;
}

/**
 * Nombre formal del curso al que se promovería un/a estudiante de `level`.
 * Null si `level` ya es 8° Básico (este establecimiento no imparte
 * Enseñanza Media -- ver COURSE_LEVEL_ORDER en services/courses.ts) o si
 * `level` no es un curso de Enseñanza Básica reconocido.
 */
export function nextFormalCourseName(level: string): string | null {
  const grade = basicaGrade(level);
  if (grade === null || grade >= 8) return null;
  return `${BASICA_ORDINALS[grade]} Año de Enseñanza Básica`;
}
