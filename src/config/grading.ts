/**
 * Valores por defecto de la escala de evaluación (editables desde
 * Administración → Configuración, persistidos en `school_config`).
 * No se asumen reglas de aprobación/repitencia: eso lo define el
 * establecimiento según su Reglamento de Evaluación.
 */
export const DEFAULT_GRADING_CONFIG = {
  scaleMin: 1.0,
  scaleMax: 7.0,
  approvalMinimum: 4.0,
  decimalPlaces: 1,
  roundingRule: "half_up" as "half_up" | "half_down" | "none",
};

export type GradingConfig = typeof DEFAULT_GRADING_CONFIG;

export function roundGrade(value: number, config: GradingConfig = DEFAULT_GRADING_CONFIG): number {
  const factor = Math.pow(10, config.decimalPlaces);
  if (config.roundingRule === "none") return value;
  if (config.roundingRule === "half_down") {
    return Math.ceil(value * factor - 0.5) / factor;
  }
  return Math.round(value * factor) / factor;
}

export function isGradeInRange(value: number, config: GradingConfig = DEFAULT_GRADING_CONFIG): boolean {
  return value >= config.scaleMin && value <= config.scaleMax;
}

export interface WeightedScore {
  score: number | null | undefined;
  weight: number;
}

/**
 * Promedio ponderado: suma(nota * ponderación) / suma(ponderación), sobre
 * las notas no nulas. Única fuente de verdad — usada tanto por la vista en
 * vivo del libro de notas como por los PDF de informes, para que nunca
 * puedan mostrar resultados distintos para el mismo estudiante.
 */
export function computeWeightedAverage(
  scores: WeightedScore[],
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of scores) {
    if (s.score === null || s.score === undefined) continue;
    weightedSum += s.score * (s.weight || 1);
    totalWeight += s.weight || 1;
  }
  return totalWeight > 0 ? roundGrade(weightedSum / totalWeight, config) : null;
}
