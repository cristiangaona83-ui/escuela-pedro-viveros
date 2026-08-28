export const CASE_STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  en_evaluacion: "En evaluación",
  protocolo_activo: "Protocolo activo",
  en_seguimiento: "En seguimiento",
  pendiente_antecedentes: "Pendiente de antecedentes",
  cerrado: "Cerrado",
};

export const CASE_STATUS_TONE: Record<string, "brand" | "accent" | "neutral" | "success" | "warning" | "danger"> = {
  abierto: "warning",
  en_evaluacion: "accent",
  protocolo_activo: "danger",
  en_seguimiento: "brand",
  pendiente_antecedentes: "warning",
  cerrado: "neutral",
};

export const PRIORITY_LABELS: Record<string, string> = { baja: "Baja", media: "Media", alta: "Alta" };
export const PRIORITY_TONE: Record<string, "success" | "warning" | "danger"> = { baja: "success", media: "warning", alta: "danger" };

export const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  involucrado: "Involucrado",
  afectado: "Afectado",
  testigo: "Testigo",
  otro: "Otro",
};

export const INTERVIEW_PARTICIPANT_LABELS: Record<string, string> = {
  estudiante: "Estudiante",
  apoderado: "Apoderado",
  funcionario: "Funcionario",
  otro: "Otro",
};

export const MEASURE_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
  requiere_revision: "Requiere revisión",
};
export const MEASURE_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "brand" | "neutral"> = {
  pendiente: "neutral",
  en_curso: "brand",
  cumplido: "success",
  no_cumplido: "danger",
  requiere_revision: "warning",
};

export const REFERRAL_TYPE_LABELS: Record<string, string> = { interna: "Interna", externa: "Externa" };
export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  respondida: "Respondida",
  cerrada: "Cerrada",
};

export const COMM_TYPE_LABELS: Record<string, string> = {
  llamada: "Llamada",
  correo: "Correo",
  entrevista: "Entrevista",
  citacion: "Citación",
  otro: "Otro",
};

export const FOLLOWUP_STATUS_LABELS: Record<string, string> = { pendiente: "Pendiente", realizado: "Realizado", cancelado: "Cancelado" };

export const PLAN_STATUS_LABELS: Record<string, string> = {
  planificada: "Planificada",
  en_ejecucion: "En ejecución",
  finalizada: "Finalizada",
  reprogramada: "Reprogramada",
};
export const PLAN_STATUS_TONE: Record<string, "neutral" | "brand" | "success" | "warning"> = {
  planificada: "neutral",
  en_ejecucion: "brand",
  finalizada: "success",
  reprogramada: "warning",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  caso_creado: "Caso creado",
  entrevista: "Entrevista",
  contacto_apoderado: "Contacto con apoderado",
  seguimiento: "Seguimiento",
  medida: "Medida",
  acuerdo: "Acuerdo",
  derivacion: "Derivación",
  protocolo: "Protocolo",
  caso_cerrado: "Caso cerrado",
  otro: "Otro",
};

export const ATTACHMENT_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  acta_reunion: "Acta de reunión",
  acta_apoderado: "Acta con apoderado",
  acta_estudiante: "Acta con estudiante",
  acta_funcionarios: "Acta con funcionarios",
  acta_seguimiento: "Acta de seguimiento",
  acta_firmada: "Acta firmada",
  acta_entrevista: "Acta de entrevista",
  otro: "Otro",
};

export const ATTACHMENT_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  finalizada: "Finalizada",
  firmada: "Firmada",
  archivada: "Archivada",
};
export const ATTACHMENT_STATUS_TONE: Record<string, "neutral" | "brand" | "success" | "warning"> = {
  borrador: "neutral",
  finalizada: "brand",
  firmada: "success",
  archivada: "warning",
};
