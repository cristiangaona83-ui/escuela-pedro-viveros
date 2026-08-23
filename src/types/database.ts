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
  status: "planificada" | "aplicada" | "cerrada";
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
  role_title: string;
  area: "directivo" | "pie" | "docente" | "convivencia" | "administrativo";
  photo_url: string | null;
  bio: string | null;
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

export type GalleryRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  image_url: string;
  event_date: string | null;
  published: boolean;
  created_at: string;
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

export type VerifyCertificateResult = {
  valid: boolean;
  folio: string;
  cert_type: CertificateType;
  student_name: string;
  issued_at: string;
  status: "vigente" | "anulado";
  institution: string;
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
      attendance: CrudTable<AttendanceRow>;
      learning_objectives: CrudTable<LearningObjectiveRow>;
      lesson_plans: CrudTable<LessonPlanRow>;
      lesson_plan_objectives: CrudTable<LessonPlanObjectiveRow>;
      student_support: CrudTable<StudentSupportRow>;
      pie_records: CrudTable<PieRecordRow>;
      classroom_observations: CrudTable<ClassroomObservationRow>;
      certificates: CrudTable<CertificateRow>;
      staff_members: CrudTable<StaffMemberRow>;
      news: CrudTable<NewsRow>;
      gallery: CrudTable<GalleryRow>;
      documents: CrudTable<DocumentRow>;
      events: CrudTable<EventRow>;
      contact_messages: CrudTable<ContactMessageRow>;
      school_config: CrudTable<SchoolConfigRow>;
      audit_logs: CrudTable<AuditLogRow>;
    };
  };
}
