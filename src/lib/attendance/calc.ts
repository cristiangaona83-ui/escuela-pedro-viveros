/**
 * Cálculos puros de asistencia -- sin acceso a datos, reutilizados por todos
 * los reportes (panorama escuela, curso, estudiante, seguimiento) para
 * garantizar que el mismo estudiante/curso siempre tenga el mismo % en
 * cualquier vista ("no generar comparaciones engañosas").
 *
 * Fórmula (igual criterio ya usado en src/services/attendance-report.ts,
 * el reporte de curso existente): % asistencia = (presente + atraso) sobre
 * el total de días con registro. Atraso cuenta como asistido (el estudiante
 * llegó, aunque tarde); retiro y ausente no.
 */

export type AttendanceStatus = "presente" | "ausente" | "atraso" | "retiro";

export interface AttendanceCounts {
  presente: number;
  ausente: number;
  atraso: number;
  retiro: number;
}

export const EMPTY_COUNTS: AttendanceCounts = { presente: 0, ausente: 0, atraso: 0, retiro: 0 };

export function addCount(counts: AttendanceCounts, status: AttendanceStatus): AttendanceCounts {
  return { ...counts, [status]: counts[status] + 1 };
}

export function totalDays(counts: AttendanceCounts): number {
  return counts.presente + counts.ausente + counts.atraso + counts.retiro;
}

/** null cuando no hay ningún día registrado -- evita la división por cero y deja claro en la UI que no hay datos, en vez de mostrar 0%. */
export function computeRate(counts: AttendanceCounts): number | null {
  const total = totalDays(counts);
  if (total === 0) return null;
  const attended = counts.presente + counts.atraso;
  return Math.round((attended / total) * 1000) / 10;
}

export type SemaforoLevel = "verde" | "amarillo" | "rojo" | "sin_datos";

export interface AttendanceThresholds {
  /** % desde el cual se considera adecuada (verde). */
  green: number;
  /** % desde el cual se considera "requiere seguimiento" (amarillo); bajo este valor es rojo. */
  yellow: number;
}

/**
 * Referencia visual inicial, NO una clasificación legal automática -- el
 * establecimiento la puede cambiar desde Configuración (school_config,
 * key "attendance_thresholds"). Ver getAttendanceThresholds().
 */
export const DEFAULT_ATTENDANCE_THRESHOLDS: AttendanceThresholds = { green: 90, yellow: 85 };

export function getSemaforo(rate: number | null, thresholds: AttendanceThresholds): SemaforoLevel {
  if (rate === null) return "sin_datos";
  if (rate >= thresholds.green) return "verde";
  if (rate >= thresholds.yellow) return "amarillo";
  return "rojo";
}

export const SEMAFORO_LABEL: Record<SemaforoLevel, string> = {
  verde: "Adecuada",
  amarillo: "Requiere seguimiento",
  rojo: "Crítica",
  sin_datos: "Sin datos",
};

export const SEMAFORO_BADGE_TONE: Record<SemaforoLevel, "success" | "warning" | "danger" | "neutral"> = {
  verde: "success",
  amarillo: "warning",
  rojo: "danger",
  sin_datos: "neutral",
};

/** Diferencia en puntos porcentuales entre dos tasas -- null si cualquiera de las dos no tiene datos (no hay tendencia que mostrar). */
export function computeTrend(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}
