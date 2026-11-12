import { z } from "zod";
import { cleanRun, isValidRun } from "@/lib/run";

/**
 * Ficha de matrícula / pre-matrícula (mismo formato que la ficha impresa de
 * Inspectoría General: 1. Matrícula e identificación, 2. Responsables y
 * antecedentes, 3. Constancias y cierre). El mismo modelo lo usan el registro
 * de Inspectoría, la pre-matrícula pública y el PDF.
 */

export const ADMISSION_TYPES = ["Nueva", "Continuidad", "Traslado"] as const;
export type AdmissionType = (typeof ADMISSION_TYPES)[number];

export const SUPPORT_OPTIONS = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "verificar", label: "Por verificar" },
] as const;

export const TRANSPORT_OPTIONS = [
  { value: "familia_a_pie", label: "Familia / a pie" },
  { value: "transporte_escolar", label: "Transporte escolar" },
  { value: "publico", label: "Público" },
  { value: "otro", label: "Otro" },
] as const;

/** Documentos que se reciben / verifican al matricular (doc_type de student_enrollment_documents). */
export const ENROLLMENT_CHECKLIST = [
  { code: "identificacion_estudiante", label: "Identificación estudiante" },
  { code: "identificacion_apoderado", label: "Identificación apoderado" },
  { code: "certificado_nacimiento", label: "Certificado de nacimiento*" },
  { code: "antecedentes_escolares", label: "Antecedentes escolares*" },
] as const;

export const IMAGE_AUTH_OPTIONS = [
  { value: "autorizo", label: "Autorizo" },
  { value: "no_autorizo", label: "No autorizo" },
] as const;

export const PREMATRICULA_STATUS_LABEL: Record<"pendiente" | "revisada" | "aceptada" | "rechazada" | "matriculada", string> = {
  pendiente: "Por revisar",
  revisada: "Revisada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  matriculada: "Matriculada",
};

export const PREMATRICULA_STATUS_TONE: Record<"pendiente" | "revisada" | "aceptada" | "rechazada" | "matriculada", "warning" | "neutral" | "brand" | "danger" | "success"> = {
  pendiente: "warning",
  revisada: "neutral",
  aceptada: "brand",
  rechazada: "danger",
  matriculada: "success",
};

export interface ContactData {
  full_name: string;
  run: string;
  relationship: string;
  phone: string;
  phone_alt: string;
  email: string;
  address: string;
}

export interface PickupPerson {
  full_name: string;
  relationship: string;
  phone: string;
}

export interface MatriculaFormData {
  // 1. Matrícula
  enrolled_at: string;
  admission_type: AdmissionType | "";
  origin_school: string;
  /** Solo pre-matrícula pública: nivel al que postula (en Inspectoría se elige el curso). */
  level_requested: string;
  // Estudiante
  first_names: string;
  paternal_last_name: string;
  maternal_last_name: string;
  run: string;
  ipe: string;
  birth_date: string;
  nationality: string;
  sex: "" | "M" | "F";
  social_name: string;
  address_street: string;
  address_commune: string;
  address_sector: string;
  // 2. Responsables
  guardian: ContactData;
  substitute: ContactData;
  emergency: { full_name: string; phone: string };
  pickup: PickupPerson[];
  pickup_restriction: string;
  emergency_alerts: string;
  support_coordination: "" | "si" | "no" | "verificar";
  transport_mode: "" | "familia_a_pie" | "transporte_escolar" | "publico" | "otro";
  documents: Record<string, boolean>;
  // 3. Constancias
  rules_informed: boolean;
  evaluation_rules_informed: boolean;
  privacy_informed: boolean;
  outings_informed: boolean;
  image_authorization: "" | "autorizo" | "no_autorizo";
  notes: string;
  received_by: string;
}

export function emptyContact(): ContactData {
  return { full_name: "", run: "", relationship: "", phone: "", phone_alt: "", email: "", address: "" };
}

export function emptyMatriculaForm(): MatriculaFormData {
  return {
    enrolled_at: new Date().toISOString().slice(0, 10),
    admission_type: "",
    origin_school: "",
    level_requested: "",
    first_names: "",
    paternal_last_name: "",
    maternal_last_name: "",
    run: "",
    ipe: "",
    birth_date: "",
    nationality: "Chilena",
    sex: "",
    social_name: "",
    address_street: "",
    address_commune: "",
    address_sector: "",
    guardian: emptyContact(),
    substitute: emptyContact(),
    emergency: { full_name: "", phone: "" },
    pickup: [
      { full_name: "", relationship: "", phone: "" },
      { full_name: "", relationship: "", phone: "" },
    ],
    pickup_restriction: "",
    emergency_alerts: "",
    support_coordination: "",
    transport_mode: "",
    documents: {},
    rules_informed: false,
    evaluation_rules_informed: false,
    privacy_informed: false,
    outings_informed: false,
    image_authorization: "",
    notes: "",
    received_by: "",
  };
}

/** Completa con valores por defecto lo que falte (datos guardados de una pre-matrícula, versiones anteriores del formulario, etc.). */
export function mergeMatriculaForm(partial: Partial<MatriculaFormData> | null | undefined): MatriculaFormData {
  const base = emptyMatriculaForm();
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    guardian: { ...base.guardian, ...(partial.guardian ?? {}) },
    substitute: { ...base.substitute, ...(partial.substitute ?? {}) },
    emergency: { ...base.emergency, ...(partial.emergency ?? {}) },
    pickup: partial.pickup && partial.pickup.length > 0 ? partial.pickup : base.pickup,
    documents: { ...(partial.documents ?? {}) },
  };
}

/** Errores por paso (1, 2 o 3) -- campo -> mensaje. Vacío si el paso está completo. */
export function validateStep(data: MatriculaFormData, step: 1 | 2 | 3, mode: "staff" | "public"): Record<string, string> {
  const errors: Record<string, string> = {};
  const need = (key: string, value: string, message = "Obligatorio") => {
    if (!value.trim()) errors[key] = message;
  };

  if (step === 1) {
    need("first_names", data.first_names);
    need("paternal_last_name", data.paternal_last_name);
    if (!data.run.trim()) errors.run = "Obligatorio";
    else if (!isValidRun(data.run)) errors.run = "RUN inválido (ej. 12345678-5)";
    need("birth_date", data.birth_date);
    if (!data.admission_type) errors.admission_type = "Elige el tipo de matrícula";
    if (mode === "public") need("level_requested", data.level_requested, "Elige el curso al que postula");
    need("address_street", data.address_street);
    need("address_commune", data.address_commune);
    need("guardian.full_name", data.guardian.full_name);
    if (!data.guardian.run.trim()) errors["guardian.run"] = "Obligatorio";
    else if (!isValidRun(data.guardian.run)) errors["guardian.run"] = "RUN inválido";
    need("guardian.relationship", data.guardian.relationship);
    need("guardian.phone", data.guardian.phone);
    if (data.guardian.email.trim() && !/^\S+@\S+\.\S+$/.test(data.guardian.email.trim())) errors["guardian.email"] = "Correo inválido";
  }

  if (step === 3 && mode === "public") {
    if (!data.privacy_informed) errors.privacy_informed = "Debes aceptar para enviar la pre-matrícula";
  }
  return errors;
}

/** Arma el payload de la función SQL register_student_enrollment. */
export function toRegisterPayload(
  data: MatriculaFormData,
  extra: { academic_year_id: string; course_id: string; prematricula_id?: string | null }
) {
  return {
    academic_year_id: extra.academic_year_id,
    course_id: extra.course_id,
    prematricula_id: extra.prematricula_id ?? null,
    enrolled_at: data.enrolled_at,
    admission_type: data.admission_type,
    origin_school: data.origin_school,
    student: {
      first_names: data.first_names,
      paternal_last_name: data.paternal_last_name,
      maternal_last_name: data.maternal_last_name,
      run: cleanRun(data.run),
      ipe: data.ipe,
      birth_date: data.birth_date,
      nationality: data.nationality,
      sex: data.sex,
      social_name: data.social_name,
      address_street: data.address_street,
      address_commune: data.address_commune,
      address_sector: data.address_sector,
    },
    guardian: { ...data.guardian, run: cleanRun(data.guardian.run) },
    substitute: { ...data.substitute, run: cleanRun(data.substitute.run) },
    emergency: data.emergency,
    pickup: data.pickup.filter((p) => p.full_name.trim()),
    pickup_restriction: data.pickup_restriction,
    emergency_alerts: data.emergency_alerts,
    support_coordination: data.support_coordination,
    transport_mode: data.transport_mode,
    documents: data.documents,
    rules_informed: data.rules_informed,
    evaluation_rules_informed: data.evaluation_rules_informed,
    privacy_informed: data.privacy_informed,
    outings_informed: data.outings_informed,
    image_authorization: data.image_authorization,
    notes: data.notes,
    received_by: data.received_by,
  };
}

// ---------------------------------------------------------------------------
// Validación del lado servidor de la pre-matrícula pública (ruta /api/pre-matricula)
// ---------------------------------------------------------------------------
const short = z.string().trim().max(200);
const long = z.string().trim().max(1500);

const contactSchema = z.object({
  full_name: short,
  run: short,
  relationship: short,
  phone: short,
  phone_alt: short,
  email: short,
  address: short,
});

export const prematriculaSchema = z.object({
  token: z.string().trim().min(8).max(64),
  /** Campo trampa: las personas no lo ven ni lo llenan; si trae algo, es un robot. */
  website: z.string().max(200).optional(),
  data: z.object({
    enrolled_at: short,
    admission_type: z.enum(ADMISSION_TYPES),
    origin_school: short,
    level_requested: short.min(1),
    first_names: short.min(1),
    paternal_last_name: short.min(1),
    maternal_last_name: short,
    run: short.refine((v) => isValidRun(v), "RUN inválido"),
    ipe: short,
    birth_date: short.min(1),
    nationality: short,
    sex: z.enum(["", "M", "F"]),
    social_name: short,
    address_street: short.min(1),
    address_commune: short.min(1),
    address_sector: short,
    guardian: contactSchema.extend({
      full_name: short.min(1),
      run: short.refine((v) => isValidRun(v), "RUN inválido"),
      phone: short.min(1),
    }),
    substitute: contactSchema,
    emergency: z.object({ full_name: short, phone: short }),
    pickup: z.array(z.object({ full_name: short, relationship: short, phone: short })).max(8),
    pickup_restriction: long,
    emergency_alerts: long,
    support_coordination: z.enum(["", "si", "no", "verificar"]),
    transport_mode: z.enum(["", "familia_a_pie", "transporte_escolar", "publico", "otro"]),
    rules_informed: z.boolean(),
    evaluation_rules_informed: z.boolean(),
    privacy_informed: z.literal(true),
    outings_informed: z.boolean(),
    image_authorization: z.enum(["", "autorizo", "no_autorizo"]),
  }),
});

export type PrematriculaInput = z.infer<typeof prematriculaSchema>;
