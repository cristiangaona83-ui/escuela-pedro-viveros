import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear, levelSortIndex } from "@/services/courses";
import type {
  ConvivenciaCaseRow,
  ConvivenciaCaseTypeRow,
  ConvivenciaProtocolRow,
  ConvivenciaEventRow,
  ConvivenciaInterviewRow,
  ConvivenciaMeasureRow,
  ConvivenciaReferralRow,
  ConvivenciaCommunicationRow,
  ConvivenciaFollowupRow,
  ConvivenciaCaseProtocolRow,
  ConvivenciaPreventiveActionRow,
  ConvivenciaManagementPlanRow,
  ConvivenciaAttachmentRow,
  ConvivenciaCaseAssignmentRow,
} from "@/types/database";

export type { ConvivenciaCaseRow };

/** Persona mínima (nombre) reutilizada en varios listados. */
export type PersonName = { id: string; full_name: string };
export type StudentName = { id: string; first_names: string; last_names: string; run: string };

export type CaseStudentWithCourse = {
  role: string;
  student: StudentName;
  courseLabel: string | null;
  courseId: string | null;
};

export type CaseListItem = ConvivenciaCaseRow & {
  caseTypeLabel: string;
  responsibleName: string;
  students: CaseStudentWithCourse[];
  nextFollowupDate: string | null;
};

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------
export async function listCaseTypes(): Promise<ConvivenciaCaseTypeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("convivencia_case_types").select("*").eq("active", true).order("order_index");
  return data ?? [];
}

export async function listProtocols(onlyActive = true): Promise<ConvivenciaProtocolRow[]> {
  const supabase = await createClient();
  let query = supabase.from("convivencia_protocols").select("*").order("order_index");
  if (onlyActive) query = query.eq("active", true);
  const { data } = await query;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Resolución de curso actual de un estudiante (matrícula activa) — mismo
// criterio que Estudiantes/Certificados: nunca se guarda el curso, se
// resuelve en vivo.
// ---------------------------------------------------------------------------
async function studentCourseMap(studentIds: string[]): Promise<Map<string, { id: string; label: string }>> {
  const map = new Map<string, { id: string; label: string }>();
  if (studentIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("student_id, status, courses(id, level, letter)")
    .in("student_id", studentIds)
    .eq("status", "activa");
  type Row = { student_id: string; courses: { id: string; level: string; letter: string } | null };
  for (const row of (data ?? []) as unknown as Row[]) {
    if (row.courses) map.set(row.student_id, { id: row.courses.id, label: `${row.courses.level} ${row.courses.letter}` });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Carpetas por curso — Casos y Situaciones (mismo patrón que Estudiantes).
// ---------------------------------------------------------------------------
export interface CourseFolderCount {
  id: string;
  level: string;
  letter: string;
  courseLabel: string;
  count: number;
}

async function currentYearCourses(): Promise<{ id: string; level: string; letter: string }[]> {
  const year = await getActiveAcademicYear();
  if (!year) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, level, letter")
    .eq("academic_year_id", year.id)
    .eq("active", true);
  return (
    (data ?? []).sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter, "es"))
  );
}

/** Carpetas de curso para Casos: cuenta de casos ACTIVOS (no cerrados) por curso, según el curso actual de cada estudiante involucrado. */
export async function listCaseCourseFolders(): Promise<CourseFolderCount[]> {
  const courses = await currentYearCourses();
  if (courses.length === 0) return [];
  const supabase = await createClient();

  const { data: caseStudents } = await supabase
    .from("convivencia_case_students")
    .select("student_id, case:convivencia_cases(status)");
  type Row = { student_id: string; case: { status: string } | null };
  const rows = (caseStudents ?? []) as unknown as Row[];
  const activeStudentIds = Array.from(new Set(rows.filter((r) => r.case && r.case.status !== "cerrado").map((r) => r.student_id)));
  const courseMap = await studentCourseMap(activeStudentIds);

  const counts = new Map<string, number>();
  const seenPerCourse = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.case || r.case.status === "cerrado") continue;
    const course = courseMap.get(r.student_id);
    if (!course) continue;
    const set = seenPerCourse.get(course.id) ?? new Set<string>();
    set.add(r.student_id);
    seenPerCourse.set(course.id, set);
  }
  for (const [courseId, set] of seenPerCourse) counts.set(courseId, set.size);

  return courses.map((c) => ({
    id: c.id,
    level: c.level,
    letter: c.letter,
    courseLabel: c.letter ? `${c.level} ${c.letter}` : c.level,
    count: counts.get(c.id) ?? 0,
  }));
}

/** Carpetas de curso para Situaciones: cuenta de situaciones registradas por curso (según el curso actual de cada estudiante involucrado). */
export async function listSituationCourseFolders(): Promise<CourseFolderCount[]> {
  const courses = await currentYearCourses();
  if (courses.length === 0) return [];
  const supabase = await createClient();

  const { data: situationStudents } = await supabase.from("convivencia_situation_students").select("student_id");
  const studentIds = Array.from(new Set((situationStudents ?? []).map((r) => r.student_id)));
  const courseMap = await studentCourseMap(studentIds);

  const seenPerCourse = new Map<string, Set<string>>();
  for (const r of situationStudents ?? []) {
    const course = courseMap.get(r.student_id);
    if (!course) continue;
    const set = seenPerCourse.get(course.id) ?? new Set<string>();
    set.add(r.student_id);
    seenPerCourse.set(course.id, set);
  }

  return courses.map((c) => ({
    id: c.id,
    level: c.level,
    letter: c.letter,
    courseLabel: c.letter ? `${c.level} ${c.letter}` : c.level,
    count: (seenPerCourse.get(c.id) ?? new Set()).size,
  }));
}

// ---------------------------------------------------------------------------
// Casos
// ---------------------------------------------------------------------------
export interface CaseFilters {
  academicYearId?: string;
  courseId?: string;
  status?: string;
  caseTypeId?: string;
  responsibleId?: string;
  search?: string;
}

async function enrichCases(cases: unknown[]): Promise<CaseListItem[]> {
  type Row = ConvivenciaCaseRow & {
    case_type: { label: string } | null;
    responsible: { full_name: string } | null;
  };
  const rows = cases as Row[];
  const supabase = await createClient();
  const caseIds = rows.map((r) => r.id);
  if (caseIds.length === 0) return [];

  const [{ data: caseStudentsRaw }, { data: followupsRaw }] = await Promise.all([
    supabase
      .from("convivencia_case_students")
      .select("case_id, role, student:students(id, first_names, last_names, run)")
      .in("case_id", caseIds),
    supabase
      .from("convivencia_followups")
      .select("case_id, next_date, status")
      .in("case_id", caseIds)
      .eq("status", "pendiente")
      .not("next_date", "is", null),
  ]);

  type CaseStudentRow = { case_id: string; role: string; student: StudentName | null };
  const caseStudentRows = (caseStudentsRaw ?? []) as unknown as CaseStudentRow[];
  const allStudentIds = Array.from(new Set(caseStudentRows.filter((r) => r.student).map((r) => r.student!.id)));
  const courseMap = await studentCourseMap(allStudentIds);

  const studentsByCase = new Map<string, CaseStudentWithCourse[]>();
  for (const r of caseStudentRows) {
    if (!r.student) continue;
    const course = courseMap.get(r.student.id);
    const list = studentsByCase.get(r.case_id) ?? [];
    list.push({ role: r.role, student: r.student, courseLabel: course?.label ?? null, courseId: course?.id ?? null });
    studentsByCase.set(r.case_id, list);
  }

  const nextFollowupByCase = new Map<string, string>();
  for (const f of (followupsRaw ?? []) as { case_id: string; next_date: string }[]) {
    const current = nextFollowupByCase.get(f.case_id);
    if (!current || f.next_date < current) nextFollowupByCase.set(f.case_id, f.next_date);
  }

  return rows.map((r) => ({
    ...r,
    caseTypeLabel: r.case_type?.label ?? "—",
    responsibleName: r.responsible?.full_name ?? "—",
    students: studentsByCase.get(r.id) ?? [],
    nextFollowupDate: nextFollowupByCase.get(r.id) ?? null,
  }));
}

export async function listCases(filters: CaseFilters = {}): Promise<CaseListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("convivencia_cases")
    .select("*, case_type:convivencia_case_types(label), responsible:profiles!convivencia_cases_responsible_id_fkey(full_name)")
    .order("opened_at", { ascending: false });

  if (filters.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters.status) query = query.eq("status", filters.status as ConvivenciaCaseRow["status"]);
  if (filters.caseTypeId) query = query.eq("case_type_id", filters.caseTypeId);
  if (filters.responsibleId) query = query.eq("responsible_id", filters.responsibleId);
  if (filters.search) query = query.or(`folio.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);

  const { data } = await query;
  let items = await enrichCases(data ?? []);

  if (filters.courseId) items = items.filter((c) => c.students.some((s) => s.courseId === filters.courseId));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (c) =>
        c.folio.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.students.some((s) => `${s.student.last_names} ${s.student.first_names}`.toLowerCase().includes(q))
    );
  }
  return items;
}

export async function listCasesForCourse(courseId: string): Promise<CaseListItem[]> {
  return listCases({ courseId });
}

export interface CaseDetail extends CaseListItem {
  closure: { conclusion: string; closed_by_name: string; closed_at: string } | null;
  assignments: (ConvivenciaCaseAssignmentRow & { profile_name: string })[];
}

export async function getCaseDetail(caseId: string): Promise<CaseDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_cases")
    .select("*, case_type:convivencia_case_types(label), responsible:profiles!convivencia_cases_responsible_id_fkey(full_name)")
    .eq("id", caseId)
    .maybeSingle();
  if (!data) return null;
  const [enriched] = await enrichCases([data]);

  const [{ data: closureRow }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("convivencia_case_closures")
      .select("conclusion, closed_at, closed_by:profiles(full_name)")
      .eq("case_id", caseId)
      .maybeSingle(),
    supabase.from("convivencia_case_assignments").select("*, profile:profiles(full_name)").eq("case_id", caseId),
  ]);

  const closure = closureRow
    ? {
        conclusion: closureRow.conclusion,
        closed_at: closureRow.closed_at,
        closed_by_name: (closureRow as unknown as { closed_by: { full_name: string } | null }).closed_by?.full_name ?? "—",
      }
    : null;

  const assignments = ((assignmentRows ?? []) as unknown as (ConvivenciaCaseAssignmentRow & { profile: { full_name: string } | null })[]).map(
    (a) => ({ ...a, profile_name: a.profile?.full_name ?? "—" })
  );

  return { ...enriched, closure, assignments };
}

// ---------------------------------------------------------------------------
// Situaciones
// ---------------------------------------------------------------------------
export type SituationListItem = {
  id: string;
  occurred_on: string;
  occurred_time: string | null;
  location: string | null;
  description: string;
  needs_followup: boolean;
  needs_protocol: boolean;
  case_id: string | null;
  case_type_id: string;
  case_type_label: string;
  reported_by_name: string;
  students: { role: string; student: StudentName; courseLabel: string | null; courseId: string | null }[];
};

export async function listSituations(filters: { courseId?: string; search?: string } = {}): Promise<SituationListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_situations")
    .select("*, case_type:convivencia_case_types(label), reported_by_profile:profiles(full_name)")
    .order("occurred_on", { ascending: false });

  type Row = {
    id: string;
    occurred_on: string;
    occurred_time: string | null;
    location: string | null;
    description: string;
    needs_followup: boolean;
    needs_protocol: boolean;
    case_id: string | null;
    case_type_id: string;
    case_type: { label: string } | null;
    reported_by_profile: { full_name: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const { data: linkRows } = await supabase
    .from("convivencia_situation_students")
    .select("situation_id, role, student:students(id, first_names, last_names, run)")
    .in("situation_id", ids);
  type LinkRow = { situation_id: string; role: string; student: StudentName | null };
  const links = (linkRows ?? []) as unknown as LinkRow[];
  const allStudentIds = Array.from(new Set(links.filter((l) => l.student).map((l) => l.student!.id)));
  const courseMap = await studentCourseMap(allStudentIds);

  const studentsBySituation = new Map<string, SituationListItem["students"]>();
  for (const l of links) {
    if (!l.student) continue;
    const course = courseMap.get(l.student.id);
    const list = studentsBySituation.get(l.situation_id) ?? [];
    list.push({ role: l.role, student: l.student, courseLabel: course?.label ?? null, courseId: course?.id ?? null });
    studentsBySituation.set(l.situation_id, list);
  }

  let items: SituationListItem[] = rows.map((r) => ({
    id: r.id,
    occurred_on: r.occurred_on,
    occurred_time: r.occurred_time,
    location: r.location,
    description: r.description,
    needs_followup: r.needs_followup,
    needs_protocol: r.needs_protocol,
    case_id: r.case_id,
    case_type_id: r.case_type_id,
    case_type_label: r.case_type?.label ?? "—",
    reported_by_name: r.reported_by_profile?.full_name ?? "—",
    students: studentsBySituation.get(r.id) ?? [],
  }));

  if (filters.courseId) items = items.filter((s) => s.students.some((st) => st.courseId === filters.courseId));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.students.some((st) => `${st.student.last_names} ${st.student.first_names}`.toLowerCase().includes(q))
    );
  }
  return items;
}

export async function getSituation(id: string): Promise<SituationListItem | null> {
  const items = await listSituations();
  return items.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Sub-entidades del caso
// ---------------------------------------------------------------------------
export async function listCaseEvents(caseId: string): Promise<(ConvivenciaEventRow & { created_by_name: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_events")
    .select("*, created_by_profile:profiles(full_name)")
    .eq("case_id", caseId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });
  return ((data ?? []) as unknown as (ConvivenciaEventRow & { created_by_profile: { full_name: string } | null })[]).map((e) => ({
    ...e,
    created_by_name: e.created_by_profile?.full_name ?? "—",
  }));
}

export async function listCaseInterviews(caseId: string): Promise<(ConvivenciaInterviewRow & { responsible_name: string; student_name: string | null; guardian_name: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_interviews")
    .select("*, responsible:profiles!convivencia_interviews_responsible_id_fkey(full_name), student:students(first_names,last_names), guardian:guardians(full_name)")
    .eq("case_id", caseId)
    .order("interview_date", { ascending: false });
  type Row = ConvivenciaInterviewRow & {
    responsible: { full_name: string } | null;
    student: { first_names: string; last_names: string } | null;
    guardian: { full_name: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    responsible_name: r.responsible?.full_name ?? "—",
    student_name: r.student ? `${r.student.last_names}, ${r.student.first_names}` : null,
    guardian_name: r.guardian?.full_name ?? null,
  }));
}

export type InterviewListItem = ConvivenciaInterviewRow & {
  responsible_name: string;
  student_name: string | null;
  guardian_name: string | null;
  case_folio: string;
};

/** Entrevistas de todos los casos visibles (respeta RLS: para
 * inspectoria_general, solo las de casos donde tiene asignación). */
export async function listAllInterviews(): Promise<InterviewListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_interviews")
    .select(
      "*, responsible:profiles!convivencia_interviews_responsible_id_fkey(full_name), student:students(first_names,last_names), guardian:guardians(full_name), case:convivencia_cases(folio)"
    )
    .order("interview_date", { ascending: false });
  type Row = ConvivenciaInterviewRow & {
    responsible: { full_name: string } | null;
    student: { first_names: string; last_names: string } | null;
    guardian: { full_name: string } | null;
    case: { folio: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    responsible_name: r.responsible?.full_name ?? "—",
    student_name: r.student ? `${r.student.last_names}, ${r.student.first_names}` : null,
    guardian_name: r.guardian?.full_name ?? null,
    case_folio: r.case?.folio ?? "—",
  }));
}

export async function getInterview(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_interviews")
    .select(
      "*, responsible:profiles!convivencia_interviews_responsible_id_fkey(full_name), student:students(first_names,last_names,run), guardian:guardians(full_name), case:convivencia_cases(folio, title)"
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listCaseMeasures(caseId: string): Promise<(ConvivenciaMeasureRow & { responsible_name: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_measures")
    .select("*, responsible:profiles(full_name)")
    .eq("case_id", caseId)
    .order("start_date", { ascending: false });
  return ((data ?? []) as unknown as (ConvivenciaMeasureRow & { responsible: { full_name: string } | null })[]).map((m) => ({
    ...m,
    responsible_name: m.responsible?.full_name ?? "—",
  }));
}

export async function listCaseReferrals(caseId: string): Promise<(ConvivenciaReferralRow & { responsible_name: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_referrals")
    .select("*, responsible:profiles(full_name)")
    .eq("case_id", caseId)
    .order("referral_date", { ascending: false });
  return ((data ?? []) as unknown as (ConvivenciaReferralRow & { responsible: { full_name: string } | null })[]).map((r) => ({
    ...r,
    responsible_name: r.responsible?.full_name ?? "—",
  }));
}

export async function listCaseCommunications(caseId: string): Promise<(ConvivenciaCommunicationRow & { staff_name: string; guardian_name: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_communications")
    .select("*, staff:profiles!convivencia_communications_staff_id_fkey(full_name), guardian:guardians(full_name)")
    .eq("case_id", caseId)
    .order("comm_date", { ascending: false });
  type Row = ConvivenciaCommunicationRow & { staff: { full_name: string } | null; guardian: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, staff_name: r.staff?.full_name ?? "—", guardian_name: r.guardian?.full_name ?? "—" }));
}

export async function listCaseProtocols(caseId: string): Promise<(ConvivenciaCaseProtocolRow & { protocol_name: string; responsible_name: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_case_protocols")
    .select("*, protocol:convivencia_protocols(name), responsible:profiles(full_name)")
    .eq("case_id", caseId)
    .order("activated_at", { ascending: false });
  type Row = ConvivenciaCaseProtocolRow & { protocol: { name: string } | null; responsible: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, protocol_name: r.protocol?.name ?? "—", responsible_name: r.responsible?.full_name ?? "—" }));
}

export type CaseAttachmentListItem = ConvivenciaAttachmentRow & { uploaded_by_name: string };

export async function listCaseAttachments(caseId: string): Promise<CaseAttachmentListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_attachments")
    .select("*, uploader:profiles!convivencia_attachments_uploaded_by_fkey(full_name)")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  type Row = ConvivenciaAttachmentRow & { uploader: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, uploaded_by_name: r.uploader?.full_name ?? "—" }));
}

// ---------------------------------------------------------------------------
// Seguimientos (vista general)
// ---------------------------------------------------------------------------
export type FollowupListItem = ConvivenciaFollowupRow & { responsible_name: string; case_folio: string; case_title: string };

export async function listFollowups(): Promise<FollowupListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_followups")
    .select("*, responsible:profiles(full_name), case:convivencia_cases(folio, title)")
    .order("next_date", { ascending: true, nullsFirst: false });
  type Row = ConvivenciaFollowupRow & { responsible: { full_name: string } | null; case: { folio: string; title: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    responsible_name: r.responsible?.full_name ?? "—",
    case_folio: r.case?.folio ?? "—",
    case_title: r.case?.title ?? "—",
  }));
}

// ---------------------------------------------------------------------------
// Acciones preventivas
// ---------------------------------------------------------------------------
export type PreventiveActionListItem = ConvivenciaPreventiveActionRow & { responsible_name: string; courseLabels: string[] };

export async function listPreventiveActions(): Promise<PreventiveActionListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convivencia_preventive_actions")
    .select("*, responsible:profiles(full_name), courses:convivencia_preventive_action_courses(course:courses(level, letter))")
    .order("action_date", { ascending: false });
  type Row = ConvivenciaPreventiveActionRow & {
    responsible: { full_name: string } | null;
    courses: { course: { level: string; letter: string } | null }[];
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    responsible_name: r.responsible?.full_name ?? "—",
    courseLabels: r.courses.filter((c) => c.course).map((c) => `${c.course!.level} ${c.course!.letter}`),
  }));
}

// ---------------------------------------------------------------------------
// Plan de Gestión
// ---------------------------------------------------------------------------
export async function listManagementPlan(academicYearId?: string): Promise<(ConvivenciaManagementPlanRow & { responsible_name: string })[]> {
  const supabase = await createClient();
  let query = supabase.from("convivencia_management_plan").select("*, responsible:profiles(full_name)").order("start_date", { ascending: true });
  if (academicYearId) query = query.eq("academic_year_id", academicYearId);
  const { data } = await query;
  return ((data ?? []) as unknown as (ConvivenciaManagementPlanRow & { responsible: { full_name: string } | null })[]).map((r) => ({
    ...r,
    responsible_name: r.responsible?.full_name ?? "—",
  }));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface DashboardFilters {
  academicYearId?: string;
  month?: number; // 1-12
  courseId?: string;
  status?: string;
  caseTypeId?: string;
}

export interface DashboardData {
  casesByStatus: Record<string, number>;
  situationsCount: number;
  preventiveActionsCount: number;
  followupsDueToday: number;
  followupsOverdue: number;
  casesByCourse: { courseLabel: string; count: number }[];
  casesByType: { label: string; count: number }[];
  closedPercent: number;
}

export async function getConvivenciaDashboard(filters: DashboardFilters = {}): Promise<DashboardData> {
  const cases = await listCases({
    academicYearId: filters.academicYearId,
    courseId: filters.courseId,
    status: filters.status,
    caseTypeId: filters.caseTypeId,
  });

  const monthFiltered = filters.month
    ? cases.filter((c) => new Date(c.opened_at).getMonth() + 1 === filters.month)
    : cases;

  const casesByStatus: Record<string, number> = {};
  for (const c of monthFiltered) casesByStatus[c.status] = (casesByStatus[c.status] ?? 0) + 1;

  const byCourse = new Map<string, number>();
  for (const c of monthFiltered) {
    const labels = Array.from(new Set(c.students.map((s) => s.courseLabel ?? "Sin curso")));
    for (const label of labels) byCourse.set(label, (byCourse.get(label) ?? 0) + 1);
  }

  const byType = new Map<string, number>();
  for (const c of monthFiltered) byType.set(c.caseTypeLabel, (byType.get(c.caseTypeLabel) ?? 0) + 1);

  const supabase = await createClient();
  const [{ count: situationsCount }, { count: preventiveActionsCount }, followups] = await Promise.all([
    supabase.from("convivencia_situations").select("id", { count: "exact", head: true }),
    supabase.from("convivencia_preventive_actions").select("id", { count: "exact", head: true }),
    listFollowups(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const followupsDueToday = followups.filter((f) => f.status === "pendiente" && f.next_date === today).length;
  const followupsOverdue = followups.filter((f) => f.status === "pendiente" && f.next_date && f.next_date < today).length;

  const closed = monthFiltered.filter((c) => c.status === "cerrado").length;
  const closedPercent = monthFiltered.length > 0 ? Math.round((closed / monthFiltered.length) * 100) : 0;

  return {
    casesByStatus,
    situationsCount: situationsCount ?? 0,
    preventiveActionsCount: preventiveActionsCount ?? 0,
    followupsDueToday,
    followupsOverdue,
    casesByCourse: Array.from(byCourse, ([courseLabel, count]) => ({ courseLabel, count })).sort((a, b) => b.count - a.count),
    casesByType: Array.from(byType, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    closedPercent,
  };
}

/** Perfiles con rol inspectoria_general — para asignar acceso operativo a un caso. */
export async function listInspectoriaProfiles(): Promise<PersonName[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("profiles(id, full_name), roles!inner(code)")
    .eq("roles.code", "inspectoria_general");
  type Row = { profiles: PersonName | null };
  return ((data ?? []) as unknown as Row[]).map((r) => r.profiles).filter((p): p is PersonName => Boolean(p));
}

// ---------------------------------------------------------------------------
// Integración con la ficha del estudiante
// ---------------------------------------------------------------------------
export interface StudentConvivenciaSummary {
  cases: { id: string; folio: string; title: string; status: string; opened_at: string }[];
  lastFollowups: { case_folio: string; followup_date: string; objective: string | null; status: string }[];
}

export async function getStudentConvivenciaSummary(studentId: string): Promise<StudentConvivenciaSummary> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("convivencia_case_students")
    .select("case:convivencia_cases(id, folio, title, status, opened_at)")
    .eq("student_id", studentId);

  type Row = { case: { id: string; folio: string; title: string; status: string; opened_at: string } | null };
  const cases = ((links ?? []) as unknown as Row[]).map((r) => r.case).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const caseIds = cases.map((c) => c.id);

  let lastFollowups: StudentConvivenciaSummary["lastFollowups"] = [];
  if (caseIds.length > 0) {
    const { data: followupRows } = await supabase
      .from("convivencia_followups")
      .select("followup_date, objective, status, case:convivencia_cases(folio)")
      .in("case_id", caseIds)
      .order("followup_date", { ascending: false })
      .limit(5);
    type FRow = { followup_date: string; objective: string | null; status: string; case: { folio: string } | null };
    lastFollowups = ((followupRows ?? []) as unknown as FRow[]).map((f) => ({
      case_folio: f.case?.folio ?? "—",
      followup_date: f.followup_date,
      objective: f.objective,
      status: f.status,
    }));
  }

  return { cases: cases.sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1)), lastFollowups };
}
