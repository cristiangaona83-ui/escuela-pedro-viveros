import type { ParvulariaLevel, ParvulariaValue } from "@/types/database";

/** Niveles de transición de Educación Parvularia que tienen Informe Pedagógico. */
export const PARVULARIA_LEVELS: ParvulariaLevel[] = ["Prekínder", "Kínder"];

/** Título de nivel tal como figura en el informe oficial. */
export const PARVULARIA_LEVEL_TITLE: Record<ParvulariaLevel, string> = {
  Prekínder: 'PRIMER NIVEL TRANSICIÓN "PRE-KÍNDER"',
  Kínder: 'SEGUNDO NIVEL TRANSICIÓN "KÍNDER"',
};

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/**
 * Nivel de parvularia de un curso (`courses.level` es texto libre: "Prekínder",
 * "Pre-Kínder", "Kínder"...), o null si no es Prekínder ni Kínder.
 */
export function parvulariaLevelOf(courseLevel: string): ParvulariaLevel | null {
  const n = normalize(courseLevel).replace(/[\s-]/g, "");
  if (n === "prekinder") return "Prekínder";
  if (n === "kinder") return "Kínder";
  return null;
}

export function isParvularia(courseLevel: string): boolean {
  return parvulariaLevelOf(courseLevel) !== null;
}

/** Escala de Evaluación Conceptual del informe. `short` es lo que se imprime en la casilla. */
export const PARVULARIA_SCALE: { value: ParvulariaValue; short: string; label: string; description: string }[] = [
  { value: "L", short: "L", label: "Logrado", description: "Mantenga y se faciliten nuevos aprendizajes." },
  { value: "ML", short: "ML", label: "Medianamente Logrado", description: "Permanente y apoyo de la familia." },
  { value: "PL", short: "PL", label: "Por Lograr", description: "No ha adquirido el aprendizaje, necesita refuerzo permanente y apoyo de la familia." },
  { value: "NO", short: "N/O", label: "No Observado", description: "No corresponde al Nivel o no corresponde al semestre o al año en curso." },
];

export function parvulariaShort(value: ParvulariaValue | undefined): string {
  return PARVULARIA_SCALE.find((s) => s.value === value)?.short ?? "";
}

/** Los tres ámbitos de experiencias de las Bases Curriculares, en el orden del informe. */
export const PARVULARIA_AMBITOS = [
  "DESARROLLO PERSONAL Y SOCIAL",
  "COMUNICACIÓN INTEGRAL",
  "INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO",
] as const;

/** Texto introductorio del informe (igual al del Word oficial). */
export const PARVULARIA_INTRO =
  "Estimada familia: El presente informe tiene como objetivo dar a conocer los logros y aprendizajes alcanzados por su hijo(a) durante este año escolar. Estos resultados responden a las Bases Curriculares propuestas por el Ministerio de Educación, abarcando los tres ámbitos de experiencias esenciales: Desarrollo Personal y Social, Comunicación Integral, e Interacción y Comprensión del Entorno.";
