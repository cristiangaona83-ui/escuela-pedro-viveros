import { createClient } from "@/lib/supabase/server";
import { levelSortIndex } from "@/services/courses";
import type { ClassSuspensionKind, ClassSuspensionReasonType, ClassSuspensionRow, ClassSuspensionScope } from "@/types/database";

export interface SuspensionCourseOption {
  id: string;
  level: string;
  letter: string;
}

export interface SuspensionListItem extends ClassSuspensionRow {
  createdByName: string;
  updatedByName: string | null;
  voidedByName: string | null;
  recoveryOfDate: string | null;
  courses: { id: string; label: string }[];
}

type ProfileJoin = { full_name: string } | null;

/** Cursos activos afectados de una suspensión (vacío cuando scope='escuela'). */
async function fetchCourseLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  suspensionIds: string[]
): Promise<Map<string, { id: string; label: string }[]>> {
  if (suspensionIds.length === 0) return new Map();
  const { data } = await supabase
    .from("class_suspension_courses")
    .select("suspension_id, course_id, courses(level, letter)")
    .in("suspension_id", suspensionIds);
  type Row = { suspension_id: string; course_id: string; courses: { level: string; letter: string } | null };
  const byId = new Map<string, { id: string; label: string }[]>();
  for (const r of (data ?? []) as unknown as Row[]) {
    const list = byId.get(r.suspension_id) ?? [];
    list.push({ id: r.course_id, label: r.courses ? `${r.courses.level} ${r.courses.letter}`.trim() : "—" });
    byId.set(r.suspension_id, list);
  }
  return byId;
}

export interface SuspensionFilters {
  from: string;
  to: string;
  courseId?: string;
  kind?: ClassSuspensionKind;
  reasonType?: ClassSuspensionReasonType;
}

const SUSPENSION_SELECT =
  "*, created_by_profile:profiles!class_suspensions_created_by_fkey(full_name), updated_by_profile:profiles!class_suspensions_updated_by_fkey(full_name), voided_by_profile:profiles!class_suspensions_voided_by_fkey(full_name), recovery_of:class_suspensions!class_suspensions_recovery_of_id_fkey(suspension_date)";

type SuspensionJoinRow = ClassSuspensionRow & {
  created_by_profile: ProfileJoin;
  updated_by_profile: ProfileJoin;
  voided_by_profile: ProfileJoin;
  recovery_of: { suspension_date: string } | null;
};

async function mapSuspensionRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: SuspensionJoinRow[]
): Promise<SuspensionListItem[]> {
  const courseLinks = await fetchCourseLinks(supabase, rows.map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    createdByName: r.created_by_profile?.full_name ?? "—",
    updatedByName: r.updated_by_profile?.full_name ?? null,
    voidedByName: r.voided_by_profile?.full_name ?? null,
    recoveryOfDate: r.recovery_of?.suspension_date ?? null,
    courses: courseLinks.get(r.id) ?? [],
  }));
}

/** Listado para el calendario/administración -- incluye activas y anuladas (la UI las distingue por estado), ordenado por fecha descendente. */
export async function listSuspensions(filters: SuspensionFilters): Promise<SuspensionListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("class_suspensions")
    .select(SUSPENSION_SELECT)
    .gte("suspension_date", filters.from)
    .lte("suspension_date", filters.to)
    .order("suspension_date", { ascending: false });
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.reasonType) query = query.eq("reason_type", filters.reasonType);

  const { data } = await query;
  const items = await mapSuspensionRows(supabase, (data ?? []) as unknown as SuspensionJoinRow[]);

  if (!filters.courseId) return items;
  return items.filter((i) => i.scope === "escuela" || i.courses.some((c) => c.id === filters.courseId));
}

export type SuspensionDetail = SuspensionListItem;

export async function getSuspension(id: string): Promise<SuspensionDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("class_suspensions").select(SUSPENSION_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const items = await mapSuspensionRows(supabase, [data as unknown as SuspensionJoinRow]);
  return items[0] ?? null;
}

interface ExcludedDateInfo {
  suspensionDate: string;
  scope: ClassSuspensionScope;
  courseIds: string[];
}

/** Suspensiones de jornada completa, activas, en el rango -- base para excluir fechas del denominador de asistencia (attendance-analytics.ts). */
async function fetchFullDaySuspensions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<ExcludedDateInfo[]> {
  const { data } = await supabase
    .from("class_suspensions")
    .select("id, suspension_date, scope")
    .eq("kind", "suspension")
    .eq("status", "activa")
    .eq("full_day", true)
    .gte("suspension_date", from)
    .lte("suspension_date", to);
  const rows = (data ?? []) as { id: string; suspension_date: string; scope: ClassSuspensionScope }[];
  if (rows.length === 0) return [];

  const courseLinks = await fetchCourseLinks(supabase, rows.map((r) => r.id));
  return rows.map((r) => ({
    suspensionDate: r.suspension_date,
    scope: r.scope,
    courseIds: r.scope === "cursos" ? (courseLinks.get(r.id) ?? []).map((c) => c.id) : [],
  }));
}

/**
 * Fechas excluidas del denominador por curso, en el rango dado -- consumido
 * por attendance-analytics.ts antes de contar/calcular cualquier % de
 * asistencia. Nunca toca la tabla attendance; solo indica qué (curso, fecha)
 * no debe considerarse.
 */
export async function getExcludedDatesByCourse(courseIds: string[], from: string, to: string): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  if (courseIds.length === 0) return result;
  const supabase = await createClient();
  const suspensions = await fetchFullDaySuspensions(supabase, from, to);

  for (const s of suspensions) {
    const affected = s.scope === "escuela" ? courseIds : s.courseIds.filter((id) => courseIds.includes(id));
    for (const courseId of affected) {
      const set = result.get(courseId) ?? new Set<string>();
      set.add(s.suspensionDate);
      result.set(courseId, set);
    }
  }
  return result;
}

/** Fechas de recuperación activas que afectan a alguno de los cursos dados (unión, para el resumen del calendario). No requiere lógica de cálculo -- si hubo clases ese día, ya cuenta normalmente vía attendance. */
export async function getRecoveredDatesByCourse(courseIds: string[], from: string, to: string): Promise<Set<string>> {
  const recoveredDates = new Set<string>();
  if (courseIds.length === 0) return recoveredDates;
  const supabase = await createClient();

  const { data: recoveryRows } = await supabase
    .from("class_suspensions")
    .select("id, suspension_date, scope")
    .eq("kind", "recuperacion")
    .eq("status", "activa")
    .gte("suspension_date", from)
    .lte("suspension_date", to);
  const recRows = (recoveryRows ?? []) as { id: string; suspension_date: string; scope: ClassSuspensionScope }[];
  const courseLinks = await fetchCourseLinks(supabase, recRows.map((r) => r.id));
  for (const r of recRows) {
    const affected = r.scope === "escuela" ? courseIds : (courseLinks.get(r.id) ?? []).map((c) => c.id);
    if (affected.some((id) => courseIds.includes(id))) recoveredDates.add(r.suspension_date);
  }
  return recoveredDates;
}

/** Cursos activos agrupados/ordenados por nivel pedagógico -- para el selector de alcance del formulario. */
export async function listSuspensionCourseOptions(): Promise<SuspensionCourseOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, level, letter").eq("active", true);
  return (data ?? []).sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter));
}

/** Suspensiones "suspension" activas -- para el selector "asociar a una suspensión anterior" del formulario de recuperación. */
export async function listActiveSuspensionsForRecoveryLink(): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_suspensions")
    .select("id, suspension_date, reason_type")
    .eq("kind", "suspension")
    .eq("status", "activa")
    .order("suspension_date", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => ({ id: r.id, label: `${r.suspension_date} — ${r.reason_type ?? "—"}` }));
}
