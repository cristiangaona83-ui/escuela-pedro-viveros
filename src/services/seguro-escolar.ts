import { createClient } from "@/lib/supabase/server";
import { getInstitutionalProfile } from "@/services/school-config";
import { formatFolio } from "@/features/seguro-escolar/utils";
import type {
  SeguroEscolarDeclarationRow,
  SeguroEscolarAttachmentRow,
  SeguroEscolarGuardianContactRow,
  SeguroEscolarFollowupRow,
  SeguroEscolarAccidentType,
  SeguroEscolarStatus,
  SeguroEscolarAttachmentType,
  SeguroEscolarFollowupStatus,
} from "@/types/database";

/**
 * "FISCAL O MUNICIPAL = 1 / PARTICULAR = 2" del formulario oficial -- para
 * este establecimiento (municipal) es un hecho estructural, no un dato que
 * varíe por declaración ni algo editable desde la configuración del sitio
 * (SITE/school_config existen para otra cosa). Igual para "Ciudad": el
 * formulario pide San Antonio explícitamente, distinto del
 * SITE.address.city más detallado ("Llolleo, San Antonio") que usa el resto
 * del sitio público.
 */
export const SEGURO_ESCOLAR_ESTABLISHMENT_TYPE_CODE = 1 as const;
export const SEGURO_ESCOLAR_CITY = "San Antonio";

export interface SeguroEscolarInstitutionalContext {
  establishmentName: string;
  city: string;
  commune: string;
  establishmentTypeCode: 1 | 2;
}

export async function getSeguroEscolarInstitutionalContext(): Promise<SeguroEscolarInstitutionalContext> {
  const profile = await getInstitutionalProfile();
  return {
    establishmentName: profile.name,
    city: SEGURO_ESCOLAR_CITY,
    commune: profile.officialRecognition.commune,
    establishmentTypeCode: SEGURO_ESCOLAR_ESTABLISHMENT_TYPE_CODE,
  };
}

// ---------------------------------------------------------------------------
// Estudiante -- resolución para precargar el formulario. Reutiliza
// listStudents()/findActiveEnrollment() y listStudentGuardiansFull(): nunca
// duplica datos de la ficha del estudiante ni la altera.
// ---------------------------------------------------------------------------
export interface SeguroEscolarStudentContext {
  studentId: string;
  firstNames: string;
  lastNames: string;
  sex: "M" | "F" | null;
  birthDate: string | null;
  courseId: string | null;
  courseLabel: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressSector: string | null;
  addressCommune: string | null;
  addressRegion: string | null;
  primaryGuardianName: string | null;
  primaryGuardianPhone: string | null;
}

export async function resolveStudentForDeclaration(studentId: string): Promise<SeguroEscolarStudentContext | null> {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select(
      "id, first_names, last_names, sex, birth_date, address_street, address_number, address_sector, address_commune, address_region, enrollments(status, courses(id, level, letter))"
    )
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return null;

  type EnrollmentJoin = { status: string; courses: { id: string; level: string; letter: string } | null };
  const enrollments = (student as unknown as { enrollments: EnrollmentJoin[] }).enrollments ?? [];
  const active = enrollments.find((e) => e.status === "activa");

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("is_primary, guardians(full_name, phone)")
    .eq("student_id", studentId);
  type GuardianJoin = { is_primary: boolean; guardians: { full_name: string; phone: string | null } | null };
  const primary = ((guardianLinks ?? []) as unknown as GuardianJoin[]).find((g) => g.is_primary);

  return {
    studentId: student.id,
    firstNames: student.first_names,
    lastNames: student.last_names,
    sex: student.sex as "M" | "F" | null,
    birthDate: student.birth_date,
    courseId: active?.courses?.id ?? null,
    courseLabel: active?.courses ? `${active.courses.level} ${active.courses.letter}`.trim() : null,
    addressStreet: student.address_street,
    addressNumber: student.address_number,
    addressSector: student.address_sector,
    addressCommune: student.address_commune,
    addressRegion: student.address_region,
    primaryGuardianName: primary?.guardians?.full_name ?? null,
    primaryGuardianPhone: primary?.guardians?.phone ?? null,
  };
}

// ---------------------------------------------------------------------------
// Declaraciones
// ---------------------------------------------------------------------------
/**
 * La escritura (crear/editar/anular una declaración) vive en los
 * componentes cliente (`src/features/seguro-escolar/`), como el resto de
 * formularios de la plataforma (ver SituationForm.tsx, EvaluationFormModal.tsx
 * -- ningún módulo usa Server Actions aquí, todos hacen `createClient()` de
 * `@/lib/supabase/client` + `.insert()/.update()` respaldado por RLS). Este
 * archivo (servicio de servidor) se mantiene de solo lectura, para las
 * páginas que listan/muestran declaraciones.
 */
export interface DeclarationListItem extends SeguroEscolarDeclarationRow {
  studentName: string;
  createdByName: string;
}

export interface DeclarationFilters {
  year?: number;
  month?: number;
  courseId?: string;
  status?: SeguroEscolarStatus;
  accidentType?: SeguroEscolarAccidentType;
  search?: string;
}

export async function listSeguroEscolarDeclarations(filters: DeclarationFilters = {}): Promise<DeclarationListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("seguro_escolar_declarations")
    .select("*, students(first_names, last_names), profiles!seguro_escolar_declarations_created_by_fkey(full_name)")
    .order("accident_date", { ascending: false });

  if (filters.year) query = query.eq("folio_year", filters.year);
  if (filters.courseId) query = query.eq("course_id", filters.courseId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.accidentType) query = query.eq("accident_type", filters.accidentType);

  const { data } = await query;
  type Row = SeguroEscolarDeclarationRow & {
    students: { first_names: string; last_names: string } | null;
    profiles: { full_name: string } | null;
  };
  let rows = (data ?? []) as unknown as Row[];

  if (filters.month) {
    rows = rows.filter((r) => new Date(r.accident_date).getMonth() + 1 === filters.month);
  }

  let items: DeclarationListItem[] = rows.map((r) => {
    const { students, profiles, ...rest } = r;
    return {
      ...rest,
      studentName: students ? `${students.last_names}, ${students.first_names}` : "—",
      createdByName: profiles?.full_name ?? "—",
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((i) => i.studentName.toLowerCase().includes(q));
  }

  return items;
}

export interface DeclarationDetail extends DeclarationListItem {
  annulledByName: string | null;
}

export async function getSeguroEscolarDeclaration(id: string): Promise<DeclarationDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seguro_escolar_declarations")
    .select(
      "*, students(first_names, last_names), profiles!seguro_escolar_declarations_created_by_fkey(full_name), annulled_by_profile:profiles!seguro_escolar_declarations_annulled_by_fkey(full_name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  type Row = SeguroEscolarDeclarationRow & {
    students: { first_names: string; last_names: string } | null;
    profiles: { full_name: string } | null;
    annulled_by_profile: { full_name: string } | null;
  };
  const r = data as unknown as Row;
  const { students, profiles, annulled_by_profile, ...rest } = r;
  return {
    ...rest,
    studentName: students ? `${students.last_names}, ${students.first_names}` : "—",
    createdByName: profiles?.full_name ?? "—",
    annulledByName: annulled_by_profile?.full_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Adjuntos
// ---------------------------------------------------------------------------
export interface AttachmentListItem extends SeguroEscolarAttachmentRow {
  uploadedByName: string;
}

export async function listDeclarationAttachments(declarationId: string): Promise<AttachmentListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seguro_escolar_attachments")
    .select("*, profiles!seguro_escolar_attachments_uploaded_by_fkey(full_name)")
    .eq("declaration_id", declarationId)
    .order("created_at", { ascending: false });
  type Row = SeguroEscolarAttachmentRow & { profiles: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const { profiles, ...rest } = r;
    return { ...rest, uploadedByName: profiles?.full_name ?? "—" };
  });
}

// ---------------------------------------------------------------------------
// Contacto apoderado
// ---------------------------------------------------------------------------
export interface GuardianContactListItem extends SeguroEscolarGuardianContactRow {
  staffName: string | null;
}

export async function listGuardianContacts(declarationId: string): Promise<GuardianContactListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seguro_escolar_guardian_contacts")
    .select("*, profiles!seguro_escolar_guardian_contacts_staff_member_id_fkey(full_name)")
    .eq("declaration_id", declarationId)
    .order("contact_date", { ascending: false });
  type Row = SeguroEscolarGuardianContactRow & { profiles: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const { profiles, ...rest } = r;
    return { ...rest, staffName: profiles?.full_name ?? null };
  });
}

// ---------------------------------------------------------------------------
// Seguimiento
// ---------------------------------------------------------------------------
export interface FollowupListItem extends SeguroEscolarFollowupRow {
  responsibleName: string | null;
}

export async function listDeclarationFollowups(declarationId: string): Promise<FollowupListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seguro_escolar_followups")
    .select("*, profiles!seguro_escolar_followups_responsible_id_fkey(full_name)")
    .eq("declaration_id", declarationId)
    .order("followup_date", { ascending: false });
  type Row = SeguroEscolarFollowupRow & { profiles: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const { profiles, ...rest } = r;
    return { ...rest, responsibleName: profiles?.full_name ?? null };
  });
}

// ---------------------------------------------------------------------------
// Historial para la ficha del estudiante
// ---------------------------------------------------------------------------
export interface StudentDeclarationHistoryItem {
  id: string;
  folio: string;
  accidentDate: string;
  accidentType: SeguroEscolarAccidentType;
  status: SeguroEscolarStatus;
}

export async function listStudentSeguroEscolarHistory(studentId: string): Promise<StudentDeclarationHistoryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seguro_escolar_declarations")
    .select("id, folio_year, folio_number, accident_date, accident_type, status")
    .eq("student_id", studentId)
    .order("accident_date", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    folio: formatFolio(r.folio_year, r.folio_number),
    accidentDate: r.accident_date,
    accidentType: r.accident_type as SeguroEscolarAccidentType,
    status: r.status as SeguroEscolarStatus,
  }));
}

export type { SeguroEscolarAttachmentType, SeguroEscolarFollowupStatus };
