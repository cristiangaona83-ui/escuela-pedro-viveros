/**
 * Tipos de la base de datos, escritos a mano para reflejar
 * supabase/migrations/0001_schema.sql.
 *
 * Cuando el proyecto esté enlazado a una instancia real de Supabase,
 * reemplazar este archivo por el generado automáticamente:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type RoleCode =
  | "director"
  | "utp"
  | "docente"
  | "pie"
  | "convivencia"
  | "administrativo"
  | "superadmin"
  | "inspectoria_general"
  | "educadora_diferencial"
  | "psicopedagoga"
  | "fonoaudiologa"
  | "psicologo";

export type CertificateType =
  | "alumno_regular"
  | "informe_semestral"
  | "informe_anual"
  | "cierre_anio";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type RoleRow = {
  id: string;
  code: RoleCode;
  name: string;
}

export type UserRoleRow = {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
}

export type AcademicYearRow = {
  id: string;
  year: number;
  active: boolean;
  created_at: string;
}

export type CourseRow = {
  id: string;
  academic_year_id: string;
  level: string;
  letter: string;
  homeroom_teacher_id: string | null;
  description: string | null;
  photo_url: string | null;
  public_visible: boolean;
  active: boolean;
  created_at: string;
}

export type SubjectRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export type TeacherAssignmentRow = {
  id: string;
  academic_year_id: string;
  course_id: string;
  subject_id: string;
  teacher_id: string;
  active: boolean;
  weekly_hours: number | null;
  created_at: string;
}

export type GuardianRow = {
  id: string;
  full_name: string;
  run: string | null;
  phone: string | null;
  phone_alt: string | null;
  email: string | null;
  address: string | null;
  relationship: string | null;
  created_at: string;
}

export type StudentGuardianRow = {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: string | null;
  is_primary: boolean;
  is_emergency_contact: boolean;
  created_at: string;
}

export type StudentStatus = "matriculado" | "retirado" | "egresado";
export type StudentSex = "M" | "F";

export type StudentRow = {
  id: string;
  first_names: string;
  last_names: string;
  run: string;
  birth_date: string | null;
  guardian_id: string | null;
  status: StudentStatus;
  notes: string | null;
  active: boolean;
  nationality: string | null;
  birth_country: string | null;
  sex: StudentSex | null;
  personal_phone: string | null;
  personal_email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_sector: string | null;
  address_commune: string | null;
  address_region: string | null;
  first_enrollment_date: string | null;
  pickup_restriction_flag: boolean;
  pickup_restriction_note: string | null;
  created_at: string;
  updated_at: string;
}

export type EnrollmentRow = {
  id: string;
  student_id: string;
  course_id: string;
  academic_year_id: string;
  status: "activa" | "retirada" | "trasladada";
  enrolled_at: string;
  enrollment_number: string | null;
  origin_school: string | null;
  origin_course: string | null;
  admission_condition: string | null;
  withdrawal_reason: string | null;
  withdrawn_at: string | null;
  reactivated_at: string | null;
  notes: string | null;
  created_at: string;
}

export type StudentPickupAuthorizationRow = {
  id: string;
  student_id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type StudentPickupRestrictionRow = {
  student_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type StudentAuthorizationRow = {
  id: string;
  student_id: string;
  auth_type: string;
  authorized: boolean;
  authorized_at: string;
  observation: string | null;
  guardian_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentEnrollmentDocumentRow = {
  id: string;
  student_id: string;
  doc_type: string;
  status: "solicitado" | "entregado" | "pendiente";
  doc_date: string | null;
  observation: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Vista de solo lectura public.guardian_contact_info (0014) — nombre, teléfono,
 * correo y vínculo del apoderado, sin RUN. Minimización de datos para roles
 * que solo necesitan contactar a la familia (p. ej. inspectoria_general). */
export type GuardianContactRow = {
  id: string;
  full_name: string;
  phone: string | null;
  phone_alt: string | null;
  email: string | null;
  address: string | null;
  relationship: string | null;
}

export type AcademicPeriodRow = {
  id: string;
  academic_year_id: string;
  name: string;
  order_index: number;
  status: "abierto" | "cerrado";
  start_date: string | null;
  end_date: string | null;
  closed_at: string | null;
  closed_by: string | null;
}

export type EvaluationRow = {
  id: string;
  course_id: string;
  subject_id: string;
  period_id: string;
  teacher_id: string;
  name: string;
  eval_type: string;
  weight: number;
  eval_date: string | null;
  description: string | null;
  status: "planificada" | "aplicada" | "cerrada" | "borrador" | "archivada";
  created_at: string;
}

export type GradeRow = {
  id: string;
  evaluation_id: string;
  student_id: string;
  score: number | null;
  observation: string | null;
  entered_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GradeChangeReason = "error_digitacion" | "correccion_docente" | "evaluacion_recuperativa" | "autorizacion_utp" | "otro";

export type GradeChangeHistoryRow = {
  id: string;
  evaluation_id: string | null;
  student_id: string | null;
  previous_score: number | null;
  new_score: number | null;
  action: "creada" | "modificada" | "eliminada" | "restaurada";
  reason: GradeChangeReason | null;
  reason_note: string | null;
  changed_by: string | null;
  evaluation_name: string | null;
  course_id: string | null;
  subject_id: string | null;
  created_at: string;
}

export type AttendanceRow = {
  id: string;
  student_id: string;
  course_id: string;
  date: string;
  status: "presente" | "ausente" | "atraso" | "retiro";
  observation: string | null;
  recorded_by: string | null;
  created_at: string;
}

export type LearningObjectiveRow = {
  id: string;
  subject_id: string;
  level: string;
  code: string;
  description: string;
  active: boolean;
}

export type LessonPlanRow = {
  id: string;
  teacher_id: string;
  course_id: string;
  subject_id: string;
  unit: string;
  objective: string | null;
  activities: string | null;
  evaluation_desc: string | null;
  resources: string | null;
  observations: string | null;
  plan_date: string | null;
  status: "borrador" | "enviada" | "revisada" | "aprobada" | "observada";
  reviewer_id: string | null;
  reviewer_comment: string | null;
  created_at: string;
  updated_at: string;
}

export type LessonPlanObjectiveRow = {
  lesson_plan_id: string;
  learning_objective_id: string;
}

export type StudentSupportRow = {
  id: string;
  student_id: string;
  subject_id: string | null;
  difficulty: string | null;
  strength: string | null;
  action: string | null;
  responsible_id: string | null;
  status: "en_seguimiento" | "resuelto" | "derivado";
  follow_up: string | null;
  event_date: string;
  created_at: string;
}

export type PieRecordRow = {
  id: string;
  student_id: string;
  coordinator_id: string | null;
  professional_id: string | null;
  support_type: string | null;
  diagnosis: string | null;
  actions: string | null;
  follow_up: string | null;
  observations: string | null;
  status: "activo" | "egresado" | "en_evaluacion";
  created_at: string;
  updated_at: string;
}

export type ClassroomObservationRow = {
  id: string;
  teacher_id: string;
  observer_id: string;
  course_id: string;
  subject_id: string | null;
  obs_date: string;
  focus: string | null;
  strengths: string | null;
  opportunities: string | null;
  agreements: string | null;
  follow_up: string | null;
  created_at: string;
}

export type CertificateRow = {
  id: string;
  folio: string;
  cert_type: CertificateType;
  student_id: string;
  academic_year_id: string;
  issued_by: string | null;
  issued_at: string;
  status: "vigente" | "anulado";
  verification_code: string;
  payload: Record<string, unknown>;
}

export type StaffMemberRow = {
  id: string;
  profile_id: string | null;
  full_name: string;
  photo_url: string | null;
  initials: string | null;
  bio: string | null;
  created_at: string;
}

export type StaffSection = "directivo" | "pie" | "asistente";

export type StaffSectionMembershipRow = {
  id: string;
  staff_member_id: string;
  section: StaffSection;
  role_title: string;
  category: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
}

export type CourseTeamRow = {
  id: string;
  course_name: string;
  order_index: number;
  active: boolean;
  created_at: string;
}

export type CourseTeamMemberRow = {
  id: string;
  course_team_id: string;
  staff_member_id: string;
  role: "jefe" | "asistente";
  role_title: string;
  order_index: number;
  created_at: string;
}

export type SubjectTeacherRow = {
  id: string;
  staff_member_id: string;
  role_title: string;
  order_index: number;
  active: boolean;
  created_at: string;
}

export type NewsRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  cover_image_url: string | null;
  gallery_urls: string[];
  published: boolean;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type GalleryMediaType = "image" | "video" | "youtube";

export type GalleryRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  /** Miniatura para cualquier media_type: la foto (image), el fotograma subido (video), o la miniatura pública de YouTube (youtube). */
  image_url: string;
  event_date: string | null;
  published: boolean;
  created_at: string;
  media_type: GalleryMediaType;
  video_url: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  resolution: string | null;
  original_size_bytes: number | null;
  optimized_size_bytes: number | null;
  savings_percent: number | null;
  youtube_id: string | null;
  youtube_url: string | null;
  order_index: number;
}

export type WeeklyBulletinRow = {
  id: string;
  number: number;
  title: string;
  week_label: string;
  publish_date: string;
  content: Record<string, unknown>;
  pdf_url: string | null;
  published: boolean;
  email_scheduled_at: string | null;
  email_sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BulletinRecipientGroup = "general" | "direccion_copia";

export type BulletinRecipientRow = {
  id: string;
  full_name: string;
  email: string;
  group_name: BulletinRecipientGroup;
  active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type BulletinEmailLogStatus = "pending" | "sent" | "failed";

export type BulletinEmailLogRow = {
  id: string;
  bulletin_id: string;
  recipient_email: string;
  status: BulletinEmailLogStatus;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

export type DocumentRow = {
  id: string;
  title: string;
  category: string;
  year: number | null;
  description: string | null;
  file_url: string;
  is_public: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string | null;
  course_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type ContactMessageRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  handled: boolean;
  created_at: string;
}

export type SchoolConfigRow = {
  key: string;
  value: Record<string, unknown>;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type ContentCardSection = "inicio_destacados" | "nuestra_escuela_sellos" | "nuestra_escuela_valores";

export type ContentCardRow = {
  id: string;
  section: ContentCardSection;
  title: string;
  description: string;
  icon: string | null;
  href: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type InstitutionalSignatureKind = "director" | "teacher" | "other";

export type InstitutionalSignatureRow = {
  id: string;
  kind: InstitutionalSignatureKind;
  staff_member_id: string | null;
  display_name: string;
  title: string;
  bucket: string;
  storage_path: string;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

type CrudTable<Row> = {
  Row: Row;
  Insert: Partial<Omit<Row, "created_at" | "updated_at">>;
  Update: Partial<Row>;
  Relationships: [];
};

// ---------------------------------------------------------------------------
// Convivencia Educativa (supabase/migrations/0026_convivencia_educativa_module.sql)
// ---------------------------------------------------------------------------
export type ConvivenciaCaseStatus =
  | "abierto" | "en_evaluacion" | "protocolo_activo" | "en_seguimiento" | "pendiente_antecedentes" | "cerrado" | "archivado";
export type ConvivenciaSituationStatus = "recibido" | "en_revision" | "en_gestion" | "cerrado" | "archivado";
export type ConvivenciaPriority = "baja" | "media" | "alta";
export type ConvivenciaParticipantRole = "involucrado" | "afectado" | "testigo" | "otro";
export type ConvivenciaEventType =
  | "caso_creado" | "entrevista" | "contacto_apoderado" | "seguimiento" | "medida" | "acuerdo" | "derivacion" | "protocolo" | "caso_cerrado"
  | "documento_agregado" | "documento_editado" | "documento_eliminado" | "caso_editado" | "caso_archivado" | "caso_enviado_papelera" | "caso_restaurado"
  | "otro";
export type ConvivenciaInterviewParticipantType = "estudiante" | "apoderado" | "funcionario" | "otro";
export type ConvivenciaMeasureStatus = "pendiente" | "en_curso" | "cumplido" | "no_cumplido" | "requiere_revision";
export type ConvivenciaReferralType = "interna" | "externa";
export type ConvivenciaReferralStatus = "pendiente" | "en_proceso" | "respondida" | "cerrada";
export type ConvivenciaCommType = "llamada" | "correo" | "entrevista" | "citacion" | "otro";
export type ConvivenciaFollowupStatus = "pendiente" | "realizado" | "cancelado";
export type ConvivenciaPlanStatus = "planificada" | "en_ejecucion" | "finalizada" | "reprogramada";

export type ConvivenciaCaseTypeRow = {
  id: string;
  code: string;
  label: string;
  order_index: number;
  active: boolean;
  created_at: string;
}

export type ConvivenciaProtocolRow = {
  id: string;
  name: string;
  description: string | null;
  reference_document_id: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
}

export type ConvivenciaSituationRow = {
  id: string;
  case_id: string | null;
  occurred_on: string;
  occurred_time: string | null;
  location: string | null;
  case_type_id: string;
  description: string;
  people_present: string | null;
  witnesses: string | null;
  background: string | null;
  immediate_action: string | null;
  needs_followup: boolean;
  needs_protocol: boolean;
  observations: string | null;
  reported_by: string;
  created_at: string;
  updated_at: string;
  status: ConvivenciaSituationStatus;
  priority_attention: boolean;
  course_id: string | null;
}

export type ConvivenciaSituationStudentRow = {
  id: string;
  situation_id: string;
  student_id: string;
  role: ConvivenciaParticipantRole;
}

export type ConvivenciaCaseRow = {
  id: string;
  folio: string;
  academic_year_id: string;
  case_type_id: string;
  title: string;
  status: ConvivenciaCaseStatus;
  priority: ConvivenciaPriority;
  responsible_id: string;
  opened_at: string;
  closed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export type ConvivenciaCaseClosureRow = {
  case_id: string;
  conclusion: string;
  closed_by: string;
  closed_at: string;
}

export type ConvivenciaCaseAssignmentRow = {
  id: string;
  case_id: string;
  profile_id: string;
  assigned_by: string;
  assigned_at: string;
}

export type ConvivenciaCaseStudentRow = {
  id: string;
  case_id: string;
  student_id: string;
  role: ConvivenciaParticipantRole;
}

export type ConvivenciaEventRow = {
  id: string;
  case_id: string;
  event_date: string;
  event_time: string | null;
  event_type: ConvivenciaEventType;
  observation: string | null;
  created_by: string;
  created_at: string;
}

export type ConvivenciaInterviewRow = {
  id: string;
  case_id: string;
  interview_date: string;
  interview_time: string | null;
  participant_type: ConvivenciaInterviewParticipantType;
  participant_student_id: string | null;
  participant_guardian_id: string | null;
  participant_other: string | null;
  reason: string | null;
  summary: string | null;
  agreements: string | null;
  commitments: string | null;
  followup_date: string | null;
  responsible_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConvivenciaMeasureRow = {
  id: string;
  case_id: string;
  description: string;
  responsible_id: string;
  start_date: string;
  review_date: string | null;
  status: ConvivenciaMeasureStatus;
  result: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConvivenciaReferralRow = {
  id: string;
  case_id: string;
  referral_date: string;
  referral_type: ConvivenciaReferralType;
  institution: string;
  reason: string;
  responsible_id: string;
  status: ConvivenciaReferralStatus;
  followup: string | null;
  response_received: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConvivenciaCommunicationRow = {
  id: string;
  case_id: string;
  comm_date: string;
  comm_type: ConvivenciaCommType;
  guardian_id: string;
  staff_id: string;
  reason: string | null;
  result: string | null;
  agreements: string | null;
  next_action: string | null;
  created_by: string;
  created_at: string;
}

export type ConvivenciaFollowupRow = {
  id: string;
  case_id: string;
  followup_date: string;
  responsible_id: string;
  objective: string | null;
  result: string | null;
  next_date: string | null;
  status: ConvivenciaFollowupStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConvivenciaCaseProtocolRow = {
  id: string;
  case_id: string;
  protocol_id: string;
  activated_at: string;
  responsible_id: string;
  stage: string | null;
  actions_done: string | null;
  actions_pending: string | null;
  deadline: string | null;
  closed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConvivenciaPreventiveActionRow = {
  id: string;
  activity: string;
  objective: string | null;
  responsible_id: string;
  action_date: string;
  participants: string | null;
  participants_count: number | null;
  evidence: string | null;
  evaluation: string | null;
  result: string | null;
  document_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConvivenciaPreventiveActionCourseRow = {
  id: string;
  preventive_action_id: string;
  course_id: string;
}

export type ConvivenciaManagementPlanRow = {
  id: string;
  academic_year_id: string;
  action: string;
  objective: string | null;
  indicator: string | null;
  responsible_id: string;
  start_date: string | null;
  end_date: string | null;
  status: ConvivenciaPlanStatus;
  evidence: string | null;
  progress_percent: number;
  observations: string | null;
  document_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Articulación PME (supabase/migrations/0031_pme_convivencia_articulacion.sql)
// Deliberadamente separado del motor normativo: el PME es gestión
// estratégica, no fuente jurídica.
// ---------------------------------------------------------------------------
export type PmePlanRow = {
  id: string;
  academic_year_id: string;
  title: string;
  document_id: string | null;
  file_url: string | null;
  source_note: string | null;
  created_by: string;
  created_at: string;
}

export type PmeActionRow = {
  id: string;
  pme_plan_id: string;
  dimension: string;
  subdimension: string | null;
  objective: string | null;
  strategy: string | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  program: string | null;
  responsible: string | null;
  resources: string | null;
  verification_means: string | null;
  amount_total: number | null;
  created_by: string;
  created_at: string;
}

export type PmeIndicatorRow = {
  id: string;
  pme_plan_id: string;
  related_action_id: string | null;
  dimension: string;
  strategy: string | null;
  name: string;
  goal: string | null;
  created_by: string;
  created_at: string;
}

export type ConvivenciaManagementPlanPmeLinkRow = {
  id: string;
  management_plan_id: string;
  pme_action_id: string;
  created_by: string;
  created_at: string;
}

export type ConvivenciaPreventiveActionPmeLinkRow = {
  id: string;
  preventive_action_id: string;
  pme_action_id: string;
  created_by: string;
  created_at: string;
}

export type ConvivenciaAttachmentDocumentType =
  | "acta_entrevista"
  | "acta_apoderado"
  | "acta_estudiante"
  | "acta_funcionarios"
  | "acta_reunion"
  | "acta_seguimiento"
  | "acta_firmada"
  | "informe_direccion"
  | "informe_convivencia"
  | "informe_externo"
  | "evidencia"
  | "resolucion"
  | "derivacion"
  | "seguimiento"
  | "documento_judicial"
  | "oficio"
  | "otro";

export type ConvivenciaAttachmentStatus = "borrador" | "finalizada" | "firmada" | "archivada";

export type ConvivenciaAttachmentRow = {
  id: string;
  case_id: string | null;
  situation_id: string | null;
  interview_id: string | null;
  preventive_action_id: string | null;
  storage_path: string;
  file_name: string;
  title: string | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  document_type: ConvivenciaAttachmentDocumentType | null;
  status: ConvivenciaAttachmentStatus;
  mime_type: string | null;
  file_size_bytes: number | null;
  related_attachment_id: string | null;
  document_date: string | null;
}

// ---------------------------------------------------------------------------
// Actas de Caso e Informes Profesionales del Psicólogo
// (supabase/migrations/0032_case_minutes_and_psychologist_reports.sql)
// ---------------------------------------------------------------------------
export type CaseMinuteModule = "convivencia" | "inspectoria";
export type CaseMinuteType = "entrevista" | "reunion";
export type CaseMinuteStatus = "borrador" | "finalizada";

export type CaseMinuteRow = {
  id: string;
  case_id: string;
  module: CaseMinuteModule;
  minute_type: CaseMinuteType;
  status: CaseMinuteStatus;
  occurred_on: string;
  occurred_time: string | null;
  location: string | null;
  guardian_id: string | null;
  staff_present: string | null;
  reason: string | null;
  background: string | null;
  facts_description: string | null;
  guardian_version: string | null;
  agreements: string | null;
  school_commitments: string | null;
  guardian_commitments: string | null;
  measures: string | null;
  responsible_id: string | null;
  followup_date: string | null;
  observations: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CaseMinuteStudentRow = {
  id: string;
  minute_id: string;
  student_id: string;
}

export type CaseMinuteAttachmentRow = {
  id: string;
  minute_id: string;
  storage_path: string;
  file_name: string;
  content_type: "application/pdf" | "image/jpeg" | "image/png";
  uploaded_by: string;
  created_at: string;
}

export type PsychologistReportStatus = "borrador" | "finalizada";

export type PsychologistReportTypeRow = {
  id: string;
  code: string;
  label: string;
  order_index: number;
  active: boolean;
  created_at: string;
}

export type PsychologistReportRow = {
  id: string;
  report_type_id: string;
  student_id: string;
  case_id: string | null;
  professional_id: string;
  report_date: string;
  reason: string | null;
  background: string | null;
  actions_taken: string | null;
  professional_observations: string | null;
  agreements: string | null;
  institutional_recommendations: string | null;
  followup: string | null;
  next_review_date: string | null;
  status: PsychologistReportStatus;
  finalized_at: string | null;
  finalized_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type VerifyCertificateResult = {
  valid: boolean;
  folio: string;
  cert_type: CertificateType;
  student_name: string;
  issued_at: string;
  status: "vigente" | "anulado";
  institution: string;
}

// ---------------------------------------------------------------------------
// Calendario de asistencia: suspensiones y recuperaciones
// (supabase/migrations/0037_class_suspensions.sql)
// ---------------------------------------------------------------------------
export type ClassSuspensionKind = "suspension" | "recuperacion";
export type ClassSuspensionScope = "escuela" | "cursos";
export type ClassSuspensionReasonType =
  | "suspension_clases"
  | "interrupcion_jornada"
  | "jornada_sin_estudiantes"
  | "emergencia"
  | "corte_servicios"
  | "clima"
  | "actividad_institucional"
  | "otro";
export type ClassSuspensionStatus = "activa" | "anulada";

export type ClassSuspensionRow = {
  id: string;
  suspension_date: string;
  kind: ClassSuspensionKind;
  scope: ClassSuspensionScope;
  reason_type: ClassSuspensionReasonType | null;
  full_day: boolean;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  observation: string | null;
  supporting_document_path: string | null;
  recovery_of_id: string | null;
  status: ClassSuspensionStatus;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export type ClassSuspensionCourseRow = {
  suspension_id: string;
  course_id: string;
}

export interface Database {
  public: {
    Views: {
      guardian_contact_info: {
        Row: GuardianContactRow;
        Relationships: [];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      verify_certificate: {
        Args: { p_code: string };
        Returns: VerifyCertificateResult[];
      };
      next_certificate_folio: {
        Args: { p_cert_type: string; p_year: number };
        Returns: string;
      };
      next_convivencia_folio: {
        Args: { p_year: number };
        Returns: string;
      };
      convivencia_case_assigned: {
        Args: { p_case_id: string };
        Returns: boolean;
      };
      log_audit: {
        Args: {
          p_action: string;
          p_module: string;
          p_entity?: string;
          p_entity_id?: string;
          p_details?: Record<string, unknown>;
        };
        Returns: void;
      };
      withdraw_student: {
        Args: { p_student_id: string; p_academic_year_id: string; p_reason?: string };
        Returns: boolean;
      };
      set_grade_administrative: {
        Args: { p_evaluation_id: string; p_student_id: string; p_score: number; p_reason: string; p_reason_note?: string };
        Returns: void;
      };
      delete_grade_administrative: {
        Args: { p_evaluation_id: string; p_student_id: string; p_reason: string; p_reason_note?: string };
        Returns: void;
      };
      delete_evaluation_administrative: {
        Args: { p_evaluation_id: string; p_reason: string; p_reason_note?: string };
        Returns: void;
      };
      send_case_to_trash_administrative: {
        Args: { p_case_id: string; p_reason?: string };
        Returns: void;
      };
      restore_case_from_trash: {
        Args: { p_case_id: string };
        Returns: void;
      };
      permanently_delete_case_administrative: {
        Args: { p_case_id: string; p_reason?: string };
        Returns: void;
      };
      permanently_delete_situation_administrative: {
        Args: { p_situation_id: string };
        Returns: string[];
      };
      permanently_delete_case_and_situation_administrative: {
        Args: { p_situation_id: string };
        Returns: string[];
      };
      update_student_fields: {
        Args: {
          p_student_id: string;
          p_first_names: string;
          p_last_names: string;
          p_run: string;
          p_birth_date: string | null;
          p_notes?: string;
        };
        Returns: boolean;
      };
      enroll_student: {
        Args: { p_student_id: string; p_course_id: string; p_academic_year_id: string };
        Returns: boolean;
      };
      create_student_with_enrollment: {
        Args: {
          p_first_names: string;
          p_last_names: string;
          p_run: string;
          p_birth_date: string | null;
          p_course_id: string;
          p_academic_year_id: string;
        };
        Returns: string;
      };
      reactivate_student: {
        Args: { p_student_id: string; p_course_id: string; p_academic_year_id: string };
        Returns: boolean;
      };
      delete_student_if_unused: {
        Args: { p_student_id: string; p_reason: string };
        Returns: boolean;
      };
      set_primary_guardian: {
        Args: { p_student_id: string; p_guardian_id: string };
        Returns: boolean;
      };
      search_guardians_by_name: {
        Args: { p_query: string };
        Returns: {
          id: string;
          full_name: string;
          phone: string | null;
          phone_alt: string | null;
          email: string | null;
          address: string | null;
          relationship: string | null;
        }[];
      };
      create_guardian_contact: {
        Args: {
          p_full_name: string;
          p_phone?: string;
          p_email?: string;
          p_relationship?: string;
          p_phone_alt?: string;
          p_address?: string;
        };
        Returns: string;
      };
      update_guardian_contact: {
        Args: {
          p_guardian_id: string;
          p_full_name: string;
          p_phone?: string;
          p_email?: string;
          p_relationship?: string;
          p_phone_alt?: string;
          p_address?: string;
        };
        Returns: boolean;
      };
      link_guardian_to_student: {
        Args: {
          p_student_id: string;
          p_guardian_id: string;
          p_relationship?: string;
          p_is_primary?: boolean;
          p_is_emergency_contact?: boolean;
        };
        Returns: boolean;
      };
      unlink_guardian_from_student: {
        Args: { p_student_id: string; p_guardian_id: string };
        Returns: boolean;
      };
      update_student_identity_extra: {
        Args: {
          p_student_id: string;
          p_nationality?: string;
          p_birth_country?: string;
          p_sex?: string;
          p_personal_phone?: string;
          p_personal_email?: string;
          p_address_street?: string;
          p_address_number?: string;
          p_address_sector?: string;
          p_address_commune?: string;
          p_address_region?: string;
        };
        Returns: boolean;
      };
      update_enrollment_details: {
        Args: {
          p_enrollment_id: string;
          p_origin_school?: string;
          p_origin_course?: string;
          p_admission_condition?: string;
          p_notes?: string;
        };
        Returns: boolean;
      };
    };
    Tables: {
      profiles: CrudTable<ProfileRow>;
      roles: CrudTable<RoleRow>;
      user_roles: CrudTable<UserRoleRow>;
      academic_years: CrudTable<AcademicYearRow>;
      courses: CrudTable<CourseRow>;
      subjects: CrudTable<SubjectRow>;
      teacher_assignments: CrudTable<TeacherAssignmentRow>;
      guardians: CrudTable<GuardianRow>;
      student_guardians: CrudTable<StudentGuardianRow>;
      students: CrudTable<StudentRow>;
      enrollments: CrudTable<EnrollmentRow>;
      student_pickup_authorizations: CrudTable<StudentPickupAuthorizationRow>;
      student_pickup_restrictions: CrudTable<StudentPickupRestrictionRow>;
      student_authorizations: CrudTable<StudentAuthorizationRow>;
      student_enrollment_documents: CrudTable<StudentEnrollmentDocumentRow>;
      academic_periods: CrudTable<AcademicPeriodRow>;
      evaluations: CrudTable<EvaluationRow>;
      grades: CrudTable<GradeRow>;
      grade_change_history: CrudTable<GradeChangeHistoryRow>;
      attendance: CrudTable<AttendanceRow>;
      learning_objectives: CrudTable<LearningObjectiveRow>;
      lesson_plans: CrudTable<LessonPlanRow>;
      lesson_plan_objectives: CrudTable<LessonPlanObjectiveRow>;
      student_support: CrudTable<StudentSupportRow>;
      pie_records: CrudTable<PieRecordRow>;
      classroom_observations: CrudTable<ClassroomObservationRow>;
      certificates: CrudTable<CertificateRow>;
      staff_members: CrudTable<StaffMemberRow>;
      staff_section_memberships: CrudTable<StaffSectionMembershipRow>;
      course_teams: CrudTable<CourseTeamRow>;
      course_team_members: CrudTable<CourseTeamMemberRow>;
      subject_teachers: CrudTable<SubjectTeacherRow>;
      news: CrudTable<NewsRow>;
      gallery: CrudTable<GalleryRow>;
      weekly_bulletins: CrudTable<WeeklyBulletinRow>;
      bulletin_recipients: CrudTable<BulletinRecipientRow>;
      bulletin_email_log: CrudTable<BulletinEmailLogRow>;
      documents: CrudTable<DocumentRow>;
      events: CrudTable<EventRow>;
      contact_messages: CrudTable<ContactMessageRow>;
      school_config: CrudTable<SchoolConfigRow>;
      institutional_signatures: CrudTable<InstitutionalSignatureRow>;
      content_cards: CrudTable<ContentCardRow>;
      audit_logs: CrudTable<AuditLogRow>;
      convivencia_case_types: CrudTable<ConvivenciaCaseTypeRow>;
      convivencia_protocols: CrudTable<ConvivenciaProtocolRow>;
      convivencia_situations: CrudTable<ConvivenciaSituationRow>;
      convivencia_situation_students: CrudTable<ConvivenciaSituationStudentRow>;
      convivencia_cases: CrudTable<ConvivenciaCaseRow>;
      convivencia_case_closures: CrudTable<ConvivenciaCaseClosureRow>;
      convivencia_case_assignments: CrudTable<ConvivenciaCaseAssignmentRow>;
      convivencia_case_students: CrudTable<ConvivenciaCaseStudentRow>;
      convivencia_events: CrudTable<ConvivenciaEventRow>;
      convivencia_interviews: CrudTable<ConvivenciaInterviewRow>;
      convivencia_measures: CrudTable<ConvivenciaMeasureRow>;
      convivencia_referrals: CrudTable<ConvivenciaReferralRow>;
      convivencia_communications: CrudTable<ConvivenciaCommunicationRow>;
      convivencia_followups: CrudTable<ConvivenciaFollowupRow>;
      convivencia_case_protocols: CrudTable<ConvivenciaCaseProtocolRow>;
      convivencia_preventive_actions: CrudTable<ConvivenciaPreventiveActionRow>;
      convivencia_preventive_action_courses: CrudTable<ConvivenciaPreventiveActionCourseRow>;
      convivencia_management_plan: CrudTable<ConvivenciaManagementPlanRow>;
      convivencia_attachments: CrudTable<ConvivenciaAttachmentRow>;
      pme_plans: CrudTable<PmePlanRow>;
      pme_actions: CrudTable<PmeActionRow>;
      pme_indicators: CrudTable<PmeIndicatorRow>;
      convivencia_management_plan_pme_links: CrudTable<ConvivenciaManagementPlanPmeLinkRow>;
      convivencia_preventive_action_pme_links: CrudTable<ConvivenciaPreventiveActionPmeLinkRow>;
      case_minutes: CrudTable<CaseMinuteRow>;
      case_minute_students: CrudTable<CaseMinuteStudentRow>;
      case_minute_attachments: CrudTable<CaseMinuteAttachmentRow>;
      psychologist_report_types: CrudTable<PsychologistReportTypeRow>;
      psychologist_reports: CrudTable<PsychologistReportRow>;
      class_suspensions: CrudTable<ClassSuspensionRow>;
      class_suspension_courses: CrudTable<ClassSuspensionCourseRow>;
    };
  };
}
