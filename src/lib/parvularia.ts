import { PARVULARIA_AMBITOS } from "@/config/parvularia";
import type { ParvulariaIndicatorRow, ParvulariaValue } from "@/types/database";

export interface IndicatorNucleus {
  nucleo: string;
  indicators: ParvulariaIndicatorRow[];
}

export interface IndicatorAmbito {
  ambito: string;
  nucleos: IndicatorNucleus[];
}

/** Clave de un valor evaluado: indicador + semestre (1 o 2). */
export function evaluationKey(indicatorId: string, semester: 1 | 2): string {
  return `${indicatorId}:${semester}`;
}

export type ParvulariaValues = Record<string, ParvulariaValue>;

/**
 * Agrupa los indicadores de un nivel en Ámbito > Núcleo > Indicador, en el
 * orden del informe: los tres ámbitos oficiales primero (en su orden), luego
 * cualquier ámbito nuevo; los núcleos y los indicadores siguen `sort_order`.
 */
export function groupIndicators(indicators: ParvulariaIndicatorRow[]): IndicatorAmbito[] {
  const sorted = indicators.slice().sort((a, b) => a.sort_order - b.sort_order);
  const ambitos = new Map<string, Map<string, ParvulariaIndicatorRow[]>>();
  for (const ind of sorted) {
    const nucleos = ambitos.get(ind.ambito) ?? new Map<string, ParvulariaIndicatorRow[]>();
    nucleos.set(ind.nucleo, [...(nucleos.get(ind.nucleo) ?? []), ind]);
    ambitos.set(ind.ambito, nucleos);
  }
  const official: readonly string[] = PARVULARIA_AMBITOS;
  const names = [...ambitos.keys()].sort((a, b) => {
    const ia = official.indexOf(a);
    const ib = official.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return names.map((ambito) => ({
    ambito,
    nucleos: [...ambitos.get(ambito)!].map(([nucleo, list]) => ({ nucleo, indicators: list })),
  }));
}


/** Numera los indicadores 1..N en el orden del informe (ámbito > núcleo). `onlyActive` deja sin número a los desactivados. */
export function indicatorNumbers(groups: IndicatorAmbito[], onlyActive = false): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;
  for (const g of groups) for (const nu of g.nucleos) for (const ind of nu.indicators) {
    if (onlyActive && !ind.active) continue;
    n += 1;
    numbers.set(ind.id, n);
  }
  return numbers;
}

/** "5 años 3 meses" a una fecha dada (por defecto hoy). Vacío si no hay fecha de nacimiento. */
export function ageLabel(birthDate: string | null, onDate: Date = new Date()): string {
  if (!birthDate) return "";
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  let months = (onDate.getFullYear() - y) * 12 + (onDate.getMonth() + 1 - m);
  if (onDate.getDate() < d) months -= 1;
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "año" : "años"}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${rest === 1 ? "mes" : "meses"}`);
  return parts.join(" ");
}
