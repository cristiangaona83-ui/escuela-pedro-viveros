/**
 * Tipos y etiquetas puras del calendario de suspensiones/recuperaciones --
 * sin acceso a datos, reutilizadas por el servicio (class-suspensions.ts) y
 * por la UI. Categorías administrativas, no una clasificación legal.
 */

export type SuspensionKind = "suspension" | "recuperacion";
export type SuspensionScope = "escuela" | "cursos";
export type SuspensionStatus = "activa" | "anulada";

export type SuspensionReasonType =
  | "suspension_clases"
  | "interrupcion_jornada"
  | "jornada_sin_estudiantes"
  | "emergencia"
  | "corte_servicios"
  | "clima"
  | "actividad_institucional"
  | "otro";

export const SUSPENSION_REASON_LABELS: Record<SuspensionReasonType, string> = {
  suspension_clases: "Suspensión de clases",
  interrupcion_jornada: "Interrupción de jornada",
  jornada_sin_estudiantes: "Jornada sin estudiantes",
  emergencia: "Emergencia",
  corte_servicios: "Corte de agua/servicios",
  clima: "Condiciones climáticas",
  actividad_institucional: "Actividad institucional sin clases",
  otro: "Otro",
};

export const SUSPENSION_KIND_LABELS: Record<SuspensionKind, string> = {
  suspension: "Suspensión / interrupción",
  recuperacion: "Día recuperado",
};

export const SUSPENSION_SCOPE_LABELS: Record<SuspensionScope, string> = {
  escuela: "Toda la escuela",
  cursos: "Cursos seleccionados",
};
