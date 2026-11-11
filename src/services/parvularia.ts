import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { parvulariaLevelOf } from "@/config/parvularia";
import { getTeachableCourses } from "@/services/academic-scope";
import { levelSortIndex } from "@/services/courses";
import { evaluationKey, type ParvulariaValues } from "@/lib/parvularia";
import type { ParvulariaIndicatorRow, ParvulariaLevel, ParvulariaReportNoteRow } from "@/types/database";

export interface ParvulariaCourseCard {
  id: string;
  label: string;
  level: ParvulariaLevel;
  matricula: number;
}

export async function listParvulariaIndicators(level: ParvulariaLevel, includeInactive = false): Promise<ParvulariaIndicatorRow[]> {
  const supabase = await createClient();
  let query = supabase.from("parvularia_indicators").select("*").eq("level", level).order("sort_order", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as ParvulariaIndicatorRow[];
}

/** Cursos de Prekínder/Kínder del año que el usuario puede ver (los docentes, solo los suyos). */
export async function listParvulariaCourses(academicYearId: string): Promise<ParvulariaCourseCard[]> {
  const supabase = await createClient();
  const [teachable, { data: courses }, { data: enrollments }, session] = await Promise.all([
    getTeachableCourses(academicYearId),
    supabase.from("courses").select("id, level, letter").eq("academic_year_id", academicYearId).eq("active", true),
    supabase.from("enrollments").select("course_id").eq("academic_year_id", academicYearId).eq("status", "activa"),
    getSessionContext(),
  ]);
  const broad = session?.roles.some((r) => ["director", "utp", "superadmin", "administrativo"].includes(r));
  const allowed = new Set(teachable.map((c) => c.course_id));

  const matricula = new Map<string, number>();
  for (const e of enrollments ?? []) matricula.set(e.course_id, (matricula.get(e.course_id) ?? 0) + 1);

  const cards: ParvulariaCourseCard[] = [];
  for (const c of courses ?? []) {
    const level = parvulariaLevelOf(c.level);
    if (!level || (!broad && !allowed.has(c.id))) continue;
    cards.push({ id: c.id, label: `${c.level} ${c.letter}`.trim(), level, matricula: matricula.get(c.id) ?? 0 });
  }
  return cards.sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.label.localeCompare(b.label));
}

export interface ParvulariaReportData {
  studentId: string;
  studentName: string;
  studentRun: string;
  birthDate: string | null;
  courseId: string;
  courseLabel: string;
  level: ParvulariaLevel;
  year: number;
  indicators: ParvulariaIndicatorRow[];
  values: ParvulariaValues;
  observations: string | null;
  deliveryDate: string | null;
}

interface CourseInfo {
  id: string;
  level: string;
  letter: string;
}

async function loadCourseAndYear(courseId: string, academicYearId: string) {
  const supabase = await createClient();
  const [{ data: course }, { data: year }] = await Promise.all([
    supabase.from("courses").select("id, level, letter").eq("id", courseId).maybeSingle(),
    supabase.from("academic_years").select("year").eq("id", academicYearId).maybeSingle(),
  ]);
  return { course: course as CourseInfo | null, year: year?.year ?? new Date().getFullYear() };
}

/** Evaluaciones y observaciones de varios niños(as) en 2 consultas. */
async function loadValues(studentIds: string[], academicYearId: string) {
  const supabase = await createClient();
  const valuesByStudent = new Map<string, ParvulariaValues>();
  const notesByStudent = new Map<string, ParvulariaReportNoteRow>();
  if (studentIds.length === 0) return { valuesByStudent, notesByStudent };

  const [{ data: evals }, { data: notes }] = await Promise.all([
    supabase.from("parvularia_evaluations").select("student_id, indicator_id, semester, value").eq("academic_year_id", academicYearId).in("student_id", studentIds),
    supabase.from("parvularia_report_notes").select("*").eq("academic_year_id", academicYearId).in("student_id", studentIds),
  ]);
  for (const e of evals ?? []) {
    const m = valuesByStudent.get(e.student_id) ?? {};
    m[evaluationKey(e.indicator_id, e.semester)] = e.value;
    valuesByStudent.set(e.student_id, m);
  }
  for (const n of (notes ?? []) as ParvulariaReportNoteRow[]) notesByStudent.set(n.student_id, n);
  return { valuesByStudent, notesByStudent };
}

/** Informe de TODOS los niños(as) con matrícula activa del curso (nómina, impresión masiva). */
export async function getParvulariaCourseReports(courseId: string, academicYearId: string): Promise<ParvulariaReportData[]> {
  const supabase = await createClient();
  const { course, year } = await loadCourseAndYear(courseId, academicYearId);
  const level = course ? parvulariaLevelOf(course.level) : null;
  if (!course || !level) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_names, last_names, run, birth_date)")
    .eq("course_id", courseId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "activa");
  type Join = { student_id: string; students: { id: string; first_names: string; last_names: string; run: string; birth_date: string | null } | null };
  const students = ((enrollments ?? []) as unknown as Join[]).filter((e) => e.students).map((e) => e.students!);
  students.sort((a, b) => a.last_names.localeCompare(b.last_names) || a.first_names.localeCompare(b.first_names));

  const [indicators, { valuesByStudent, notesByStudent }] = await Promise.all([
    listParvulariaIndicators(level),
    loadValues(students.map((s) => s.id), academicYearId),
  ]);

  return students.map((s) => ({
    studentId: s.id,
    studentName: `${s.first_names} ${s.last_names}`,
    studentRun: s.run,
    birthDate: s.birth_date,
    courseId,
    courseLabel: `${course.level} ${course.letter}`.trim(),
    level,
    year,
    indicators,
    values: valuesByStudent.get(s.id) ?? {},
    observations: notesByStudent.get(s.id)?.observations ?? null,
    deliveryDate: notesByStudent.get(s.id)?.delivery_date ?? null,
  }));
}

/** Informe de un niño(a). null si no tiene matrícula activa en un curso de Prekínder/Kínder ese año. */
export async function getParvulariaStudentReport(studentId: string, academicYearId: string): Promise<ParvulariaReportData | null> {
  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "activa")
    .maybeSingle();
  if (!enrollment) return null;
  const reports = await getParvulariaCourseReports(enrollment.course_id, academicYearId);
  return reports.find((r) => r.studentId === studentId) ?? null;
}

/** Cuántos indicadores tienen valor en cada semestre (para el avance de la nómina). */
export function reportProgress(report: ParvulariaReportData) {
  const filled = { 1: 0, 2: 0 };
  for (const ind of report.indicators) {
    if (report.values[evaluationKey(ind.id, 1)]) filled[1] += 1;
    if (report.values[evaluationKey(ind.id, 2)]) filled[2] += 1;
  }
  return { filled, total: report.indicators.length, hasObservations: Boolean(report.observations?.trim()) };
}
