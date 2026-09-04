import type {
  SeguroEscolarStatus,
  SeguroEscolarAccidentType,
  SeguroEscolarAttachmentType,
  SeguroEscolarFollowupStatus,
  SeguroEscolarIncapacityType,
  SeguroEscolarClosureCause,
} from "@/types/database";

export const SEGURO_ESCOLAR_STATUS_LABELS: Record<SeguroEscolarStatus, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  entregado: "Entregado",
  en_seguimiento: "En seguimiento",
  cerrado: "Cerrado",
  anulado: "Anulado",
};

export const SEGURO_ESCOLAR_STATUS_TONE: Record<SeguroEscolarStatus, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  borrador: "neutral",
  emitido: "brand",
  entregado: "brand",
  en_seguimiento: "warning",
  cerrado: "success",
  anulado: "danger",
};

/** Codificación oficial del formulario 0374-3: De trayecto = 1, En la escuela = 2. */
export const SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS: Record<SeguroEscolarAccidentType, string> = {
  trayecto: "De trayecto (1)",
  escuela: "En la escuela (2)",
};

export const SEGURO_ESCOLAR_ATTACHMENT_TYPE_LABELS: Record<SeguroEscolarAttachmentType, string> = {
  seguro_firmado: "Seguro Escolar firmado",
  documento_atencion: "Documento de atención",
  certificado: "Certificado",
  documento_centro_asistencial: "Documento del centro asistencial",
  respaldo_seguimiento: "Respaldo de seguimiento",
  otro: "Otro",
};

export const SEGURO_ESCOLAR_FOLLOWUP_STATUS_LABELS: Record<SeguroEscolarFollowupStatus, string> = {
  pendiente: "Pendiente",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

/** Codificación oficial Sección D -- Tipo de Incapacidad. */
export const SEGURO_ESCOLAR_INCAPACITY_TYPE_LABELS: Record<SeguroEscolarIncapacityType, string> = {
  leve: "Leve (1)",
  temporal: "Temporal (2)",
  invalidez_parcial: "Invalidez parcial (3)",
  invalidez_total: "Invalidez total (4)",
  gran_invalidez: "Gran invalidez (5)",
  muerte: "Muerte (6)",
};

/** Codificación oficial Sección D -- Causa de Cierre del Caso. */
export const SEGURO_ESCOLAR_CLOSURE_CAUSE_LABELS: Record<SeguroEscolarClosureCause, string> = {
  alta_medica: "Alta médica (1)",
  invalidez: "Invalidez (2)",
  abandono_tratamiento: "Abandono de tratamiento (3)",
  muerte: "Muerte (4)",
};
