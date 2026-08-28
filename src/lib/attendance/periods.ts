/**
 * Rangos de fecha para los filtros de período de los reportes de asistencia.
 * Puras (sin acceso a datos) salvo por la fecha actual del sistema.
 */

export type PeriodKey = "hoy" | "semana" | "mes" | "semestre" | "anio" | "personalizado";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  label: string;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day; // retrocede al lunes
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * `semester` es un academic_periods (start_date/end_date) ya cargado para el
 * año vigente, si existe -- se usa tal cual en vez de inventar fechas de
 * semestre. `customFrom`/`customTo` solo aplican cuando key === "personalizado".
 */
export function getPeriodRange(
  key: PeriodKey,
  opts: { today?: Date; customFrom?: string; customTo?: string; semester?: { start_date: string | null; end_date: string | null; name: string } | null; academicYear?: number } = {}
): DateRange {
  const today = opts.today ?? new Date();
  const todayIso = iso(today);

  switch (key) {
    case "hoy":
      return { from: todayIso, to: todayIso, label: "Hoy" };
    case "semana": {
      const start = startOfWeek(today);
      return { from: iso(start), to: todayIso, label: "Semana actual" };
    }
    case "mes": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: iso(start), to: todayIso, label: "Mes actual" };
    }
    case "semestre": {
      if (opts.semester?.start_date) {
        const to = opts.semester.end_date && opts.semester.end_date < todayIso ? opts.semester.end_date : todayIso;
        return { from: opts.semester.start_date, to, label: opts.semester.name };
      }
      // Sin períodos académicos configurados con fechas: se aproxima el
      // semestre en curso sobre el año calendario (marzo-julio / agosto-diciembre),
      // criterio habitual chileno, solo como respaldo visual.
      const year = today.getFullYear();
      const isFirstHalf = today.getMonth() < 7; // antes de agosto
      const from = isFirstHalf ? `${year}-03-01` : `${year}-08-01`;
      return { from, to: todayIso, label: isFirstHalf ? "1er semestre (aprox.)" : "2do semestre (aprox.)" };
    }
    case "anio": {
      const year = opts.academicYear ?? today.getFullYear();
      const from = `${year}-03-01`;
      const to = today.getFullYear() === year ? todayIso : `${year}-12-31`;
      return { from, to, label: `Año ${year}` };
    }
    case "personalizado":
      return {
        from: opts.customFrom ?? todayIso,
        to: opts.customTo ?? todayIso,
        label: "Rango personalizado",
      };
  }
}

/** Rango inmediatamente anterior, de la misma duración -- para la tendencia respecto del período anterior. */
export function getPreviousPeriodRange(range: DateRange): DateRange {
  const from = new Date(range.from + "T00:00:00");
  const to = new Date(range.to + "T00:00:00");
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: iso(prevFrom), to: iso(prevTo), label: "Período anterior" };
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoy: "Hoy",
  semana: "Semana actual",
  mes: "Mes",
  semestre: "Semestre",
  anio: "Año completo",
  personalizado: "Rango personalizado",
};
