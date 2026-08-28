import { createClient } from "@/lib/supabase/server";
import { levelSortIndex } from "@/services/courses";
import {
  EMPTY_COUNTS,
  addCount,
  computeRate,
  computeTrend,
  getSemaforo,
  DEFAULT_ATTENDANCE_THRESHOLDS,
  type AttendanceCounts,
  type AttendanceStatus,
  type AttendanceThresholds,
  type SemaforoLevel,
} from "@/lib/attendance/calc";
import { getPeriodRange, getPreviousPeriodRange, type DateRange, type PeriodKey } from "@/lib/attendance/periods";
import { getActiveAcademicYear } from "@/services/courses";
import { getExcludedDatesByCourse, getRecoveredDatesByCourse } from "@/services/class-suspensions";

const PAGE_SIZE = 1000;

/**
 * Resuelve ?period=&from=&to= a un DateRange real, usando el semestre
 * (academic_periods) y el año académico vigentes cuando existen -- nunca
 * fechas inventadas cuando hay datos reales para usar.
 */
export async function resolvePeriodFromSearchParams(searchParams: {
  period?: string;
  from?: string;
  to?: string;
}): Promise<{ range: DateRange; period: PeriodKey }> {
  const supabase = await createClient();
  const validKeys: PeriodKey[] = ["hoy", "semana", "mes", "semestre", "anio", "personalizado"];
  const period = (validKeys.includes(searchParams.period as PeriodKey) ? searchParams.period : "mes") as PeriodKey;

  const activeYear = await getActiveAcademicYear();
  let semester: { start_date: string | null; end_date: string | null; name: string } | null = null;
  if (period === "semestre" && activeYear) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: periods } = await supabase
      .from("academic_periods")
      .select("name, start_date, end_date")
      .eq("academic_year_id", activeYear.id)
      .order("order_index", { ascending: true });
    semester =
      (periods ?? []).find((p) => p.start_date && p.end_date && p.start_date <= today && today <= p.end_date) ??
      (periods ?? [])[(periods ?? []).length - 1] ??
      null;
  }

  const range = getPeriodRange(period, {
    customFrom: searchParams.from,
    customTo: searchParams.to,
    semester,
    academicYear: activeYear?.year,
  });

  return { range, period };
}

/**
 * Configuración de los umbrales del semáforo -- reutiliza school_config
 * (0001_schema.sql), igual patrón que grading_scale/certificate_signature
 * en services/school-config.ts. No es una migración nueva: es una fila más
 * en una tabla clave/valor que ya existe para esto exacto.
 */
export async function getAttendanceThresholds(): Promise<AttendanceThresholds> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("school_config").select("value").eq("key", "attendance_thresholds").maybeSingle();
    if (!data) return DEFAULT_ATTENDANCE_THRESHOLDS;
    const value = data.value as Partial<AttendanceThresholds>;
    return {
      green: typeof value.green === "number" ? value.green : DEFAULT_ATTENDANCE_THRESHOLDS.green,
      yellow: typeof value.yellow === "number" ? value.yellow : DEFAULT_ATTENDANCE_THRESHOLDS.yellow,
    };
  } catch {
    return DEFAULT_ATTENDANCE_THRESHOLDS;
  }
}

export async function saveAttendanceThresholds(thresholds: AttendanceThresholds, updatedBy: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("school_config")
    .upsert({ key: "attendance_thresholds", value: { green: thresholds.green, yellow: thresholds.yellow }, is_public: false, updated_by: updatedBy }, { onConflict: "key" });
}

interface RawAttendanceRow {
  course_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
}

/** Trae TODAS las filas del rango paginando de a 1000 (límite por defecto de PostgREST) -- un año completo de un curso numeroso supera eso fácilmente. Selecciona solo las columnas que se usan, nunca una fila por estudiante. */
async function fetchAttendanceRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: { courseIds?: string[]; studentId?: string; from: string; to: string }
): Promise<RawAttendanceRow[]> {
  const all: RawAttendanceRow[] = [];
  let from = 0;
  for (;;) {
    let query = supabase
      .from("attendance")
      .select("course_id, student_id, date, status")
      .gte("date", filters.from)
      .lte("date", filters.to)
      .order("date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (filters.courseIds) query = query.in("course_id", filters.courseIds);
    if (filters.studentId) query = query.eq("student_id", filters.studentId);
    const { data, error } = await query;
    if (error || !data) break;
    all.push(...(data as RawAttendanceRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Descarta filas de attendance cuya fecha cae en una suspensión de jornada
 * completa activa para ese curso (class_suspensions vía class-suspensions.ts).
 * Nunca borra ni edita las filas en la base -- solo las excluye de este
 * cálculo, así que una suspensión registrada hoy sobre una fecha pasada
 * recalcula el % automáticamente la próxima vez que se pida el reporte.
 */
function filterExcludedRows(rows: RawAttendanceRow[], excludedByCourse: Map<string, Set<string>>): RawAttendanceRow[] {
  if (excludedByCourse.size === 0) return rows;
  return rows.filter((r) => !excludedByCourse.get(r.course_id)?.has(r.date));
}

function groupByCourse(rows: RawAttendanceRow[]): Map<string, { counts: AttendanceCounts; dates: Set<string> }> {
  const byCourse = new Map<string, { counts: AttendanceCounts; dates: Set<string> }>();
  for (const r of rows) {
    const entry = byCourse.get(r.course_id) ?? { counts: EMPTY_COUNTS, dates: new Set<string>() };
    entry.counts = addCount(entry.counts, r.status);
    entry.dates.add(r.date);
    byCourse.set(r.course_id, entry);
  }
  return byCourse;
}

function groupByStudent(rows: RawAttendanceRow[]): Map<string, { counts: AttendanceCounts; courseId: string; dates: { date: string; status: AttendanceStatus }[] }> {
  const byStudent = new Map<string, { counts: AttendanceCounts; courseId: string; dates: { date: string; status: AttendanceStatus }[] }>();
  for (const r of rows) {
    const entry = byStudent.get(r.student_id) ?? { counts: EMPTY_COUNTS, courseId: r.course_id, dates: [] };
    entry.counts = addCount(entry.counts, r.status);
    entry.dates.push({ date: r.date, status: r.status });
    byStudent.set(r.student_id, entry);
  }
  return byStudent;
}

// ---------------------------------------------------------------------------
// Panorama de la escuela
// ---------------------------------------------------------------------------
export interface CourseOverviewRow {
  courseId: string;
  courseLabel: string;
  level: string;
  matricula: number;
  counts: AttendanceCounts;
  diasLectivos: number;
  rate: number | null;
  trend: number | null;
  belowYellow: number; // estudiantes bajo el umbral amarillo (ej. <85%), coincide con el ejemplo del pedido
  semaforo: SemaforoLevel;
}

export interface SchoolAttendanceOverview {
  range: DateRange;
  previousRange: DateRange;
  thresholds: AttendanceThresholds;
  courses: CourseOverviewRow[];
  totals: {
    matricula: number;
    counts: AttendanceCounts;
    rate: number | null;
    trend: number | null;
    bestCourse: { courseId: string; courseLabel: string; rate: number } | null;
    worstCourse: { courseId: string; courseLabel: string; rate: number } | null;
    under90: number;
    under85: number;
    under80: number;
    critical: number; // bajo el umbral rojo configurado (mismo criterio que el semáforo, no un tercer número inventado)
  };
}

/** courseIds: alcance ya resuelto por el llamador (getTeachableCourses() filtrado a cursos activos del año), nunca "todos los cursos" sin pasar por ese control. */
export async function getSchoolAttendanceOverview(
  courseIds: string[],
  range: DateRange,
  thresholds: AttendanceThresholds
): Promise<SchoolAttendanceOverview> {
  const supabase = await createClient();
  const previousRange = getPreviousPeriodRange(range);

  if (courseIds.length === 0) {
    return {
      range,
      previousRange,
      thresholds,
      courses: [],
      totals: { matricula: 0, counts: EMPTY_COUNTS, rate: null, trend: null, bestCourse: null, worstCourse: null, under90: 0, under85: 0, under80: 0, critical: 0 },
    };
  }

  const unionFrom = range.from < previousRange.from ? range.from : previousRange.from;
  const unionTo = range.to > previousRange.to ? range.to : previousRange.to;

  const [{ data: courses }, { data: enrollmentRows }, rawCurrentRows, rawPreviousRows, excludedByCourse] = await Promise.all([
    supabase.from("courses").select("id, level, letter").in("id", courseIds),
    supabase.from("enrollments").select("course_id").eq("status", "activa").in("course_id", courseIds),
    fetchAttendanceRows(supabase, { courseIds, from: range.from, to: range.to }),
    fetchAttendanceRows(supabase, { courseIds, from: previousRange.from, to: previousRange.to }),
    getExcludedDatesByCourse(courseIds, unionFrom, unionTo),
  ]);
  const currentRows = filterExcludedRows(rawCurrentRows, excludedByCourse);
  const previousRows = filterExcludedRows(rawPreviousRows, excludedByCourse);

  const matriculaByCourse = new Map<string, number>();
  for (const e of enrollmentRows ?? []) {
    matriculaByCourse.set(e.course_id, (matriculaByCourse.get(e.course_id) ?? 0) + 1);
  }

  const currentByCourse = groupByCourse(currentRows);
  const previousByCourse = groupByCourse(previousRows);
  const currentByStudent = groupByStudent(currentRows);

  const courseRows: CourseOverviewRow[] = (courses ?? [])
    .map((c) => {
      const label = `${c.level} ${c.letter}`.trim();
      const agg = currentByCourse.get(c.id);
      const counts = agg?.counts ?? EMPTY_COUNTS;
      const rate = computeRate(counts);
      const prevRate = computeRate(previousByCourse.get(c.id)?.counts ?? EMPTY_COUNTS);
      const belowYellow = Array.from(currentByStudent.values()).filter((s) => {
        if (s.courseId !== c.id) return false;
        const r = computeRate(s.counts);
        return r !== null && r < thresholds.yellow;
      }).length;
      return {
        courseId: c.id,
        courseLabel: label,
        level: c.level,
        matricula: matriculaByCourse.get(c.id) ?? 0,
        counts,
        diasLectivos: agg?.dates.size ?? 0,
        rate,
        trend: computeTrend(rate, prevRate),
        belowYellow,
        semaforo: getSemaforo(rate, thresholds),
      };
    })
    .sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.courseLabel.localeCompare(b.courseLabel));

  const totalCounts = courseRows.reduce<AttendanceCounts>(
    (acc, c) => ({
      presente: acc.presente + c.counts.presente,
      ausente: acc.ausente + c.counts.ausente,
      atraso: acc.atraso + c.counts.atraso,
      retiro: acc.retiro + c.counts.retiro,
    }),
    EMPTY_COUNTS
  );
  const totalMatricula = courseRows.reduce((acc, c) => acc + c.matricula, 0);
  const schoolRate = computeRate(totalCounts);
  const prevTotalCounts = Array.from(previousByCourse.values()).reduce<AttendanceCounts>(
    (acc, c) => ({
      presente: acc.presente + c.counts.presente,
      ausente: acc.ausente + c.counts.ausente,
      atraso: acc.atraso + c.counts.atraso,
      retiro: acc.retiro + c.counts.retiro,
    }),
    EMPTY_COUNTS
  );
  const schoolPrevRate = computeRate(prevTotalCounts);

  const withRate = courseRows.filter((c) => c.rate !== null);
  const bestCourse = withRate.length > 0 ? withRate.reduce((a, b) => (b.rate! > a.rate! ? b : a)) : null;
  const worstCourse = withRate.length > 0 ? withRate.reduce((a, b) => (b.rate! < a.rate! ? b : a)) : null;

  let under90 = 0;
  let under85 = 0;
  let under80 = 0;
  let critical = 0;
  for (const s of currentByStudent.values()) {
    const r = computeRate(s.counts);
    if (r === null) continue;
    if (r < 90) under90++;
    if (r < 85) under85++;
    if (r < 80) under80++;
    if (r < thresholds.yellow) critical++;
  }

  return {
    range,
    previousRange,
    thresholds,
    courses: courseRows,
    totals: {
      matricula: totalMatricula,
      counts: totalCounts,
      rate: schoolRate,
      trend: computeTrend(schoolRate, schoolPrevRate),
      bestCourse: bestCourse ? { courseId: bestCourse.courseId, courseLabel: bestCourse.courseLabel, rate: bestCourse.rate! } : null,
      worstCourse: worstCourse ? { courseId: worstCourse.courseId, courseLabel: worstCourse.courseLabel, rate: worstCourse.rate! } : null,
      under90,
      under85,
      under80,
      critical,
    },
  };
}

// ---------------------------------------------------------------------------
// Detalle por curso
// ---------------------------------------------------------------------------
export interface MonthPoint {
  month: string; // "2026-03"
  monthLabel: string; // "Marzo"
  rate: number | null;
}

export interface CourseStudentRow {
  studentId: string;
  fullName: string;
  run: string;
  counts: AttendanceCounts;
  rate: number | null;
  trend: number | null;
  lastAbsence: string | null;
  semaforo: SemaforoLevel;
}

export interface CourseAttendanceDetail {
  courseId: string;
  courseLabel: string;
  teacherName: string | null;
  range: DateRange;
  matricula: number;
  counts: AttendanceCounts;
  diasLectivos: number;
  rate: number | null;
  monthlyEvolution: MonthPoint[];
  students: CourseStudentRow[];
}

const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function monthlyEvolutionFromRows(rows: RawAttendanceRow[]): MonthPoint[] {
  const byMonth = new Map<string, AttendanceCounts>();
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    byMonth.set(month, addCount(byMonth.get(month) ?? EMPTY_COUNTS, r.status));
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, monthLabel: MONTH_LABELS[Number(month.slice(5, 7)) - 1] ?? month, rate: computeRate(counts) }));
}

export async function getCourseAttendanceDetail(
  courseId: string,
  range: DateRange,
  thresholds: AttendanceThresholds
): Promise<CourseAttendanceDetail | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("level, letter, profiles!courses_homeroom_teacher_id_fkey(full_name)")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return null;
  const teacher = course.profiles as unknown as { full_name: string } | null;

  const previousRangeForCourse = getPreviousPeriodRange(range);
  const yearFrom = `${range.to.slice(0, 4)}-01-01`;
  const yearTo = `${range.to.slice(0, 4)}-12-31`;
  const unionFrom = [range.from, previousRangeForCourse.from, yearFrom].sort()[0];
  const unionTo = [range.to, previousRangeForCourse.to, yearTo].sort().at(-1)!;

  const [{ data: enrollments }, rawCurrentRows, rawPreviousRows, rawYearRows, excludedByCourse] = await Promise.all([
    supabase.from("enrollments").select("student_id, students(id, first_names, last_names, run)").eq("course_id", courseId).eq("status", "activa"),
    fetchAttendanceRows(supabase, { courseIds: [courseId], from: range.from, to: range.to }),
    fetchAttendanceRows(supabase, { courseIds: [courseId], from: previousRangeForCourse.from, to: previousRangeForCourse.to }),
    // Evolución mensual siempre sobre el año calendario del filtro, para que tenga sentido aunque el período activo sea "semana" o "mes".
    fetchAttendanceRows(supabase, { courseIds: [courseId], from: yearFrom, to: yearTo }),
    getExcludedDatesByCourse([courseId], unionFrom, unionTo),
  ]);
  const currentRows = filterExcludedRows(rawCurrentRows, excludedByCourse);
  const previousRows = filterExcludedRows(rawPreviousRows, excludedByCourse);
  const yearRows = filterExcludedRows(rawYearRows, excludedByCourse);

  const byStudent = groupByStudent(currentRows);
  const prevByStudent = groupByStudent(previousRows);
  const lastAbsenceByStudent = new Map<string, string>();
  for (const r of currentRows) {
    if (r.status !== "ausente") continue;
    const prev = lastAbsenceByStudent.get(r.student_id);
    if (!prev || r.date > prev) lastAbsenceByStudent.set(r.student_id, r.date);
  }

  type EnrollmentJoin = { student_id: string; students: { id: string; first_names: string; last_names: string; run: string } | null };
  const students: CourseStudentRow[] = ((enrollments ?? []) as unknown as EnrollmentJoin[])
    .filter((e) => e.students)
    .map((e) => {
      const s = e.students!;
      const counts = byStudent.get(s.id)?.counts ?? EMPTY_COUNTS;
      const rate = computeRate(counts);
      const prevRate = computeRate(prevByStudent.get(s.id)?.counts ?? EMPTY_COUNTS);
      return {
        studentId: s.id,
        fullName: `${s.last_names}, ${s.first_names}`,
        run: s.run,
        counts,
        rate,
        trend: computeTrend(rate, prevRate),
        lastAbsence: lastAbsenceByStudent.get(s.id) ?? null,
        semaforo: getSemaforo(rate, thresholds),
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const totalCounts = currentRows.reduce((acc, r) => addCount(acc, r.status), EMPTY_COUNTS);
  const diasLectivos = new Set(currentRows.map((r) => r.date)).size;

  return {
    courseId,
    courseLabel: `${course.level} ${course.letter}`.trim(),
    teacherName: teacher?.full_name ?? null,
    range,
    matricula: students.length,
    counts: totalCounts,
    diasLectivos,
    rate: computeRate(totalCounts),
    monthlyEvolution: monthlyEvolutionFromRows(yearRows),
    students,
  };
}

// ---------------------------------------------------------------------------
// Detalle individual del estudiante
// ---------------------------------------------------------------------------
export interface StudentAttendanceDetail {
  studentId: string;
  fullName: string;
  run: string;
  courseId: string | null;
  courseLabel: string | null;
  yearRate: number | null;
  monthRate: number | null;
  weekRate: number | null;
  counts: AttendanceCounts; // del año en curso
  history: { date: string; status: AttendanceStatus; observation: string | null; excluded: boolean }[]; // del rango seleccionado -- excluded=true si ese día fue una suspensión institucional (queda en el historial para trazabilidad, pero no cuenta en los % de arriba)
  monthlyEvolution: MonthPoint[];
  trend: number | null; // últimos 30 días vs los 30 anteriores
  lastAbsence: string | null;
  semaforo: SemaforoLevel;
}

export async function getStudentAttendanceDetail(studentId: string, range: DateRange, thresholds: AttendanceThresholds): Promise<StudentAttendanceDetail | null> {
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("first_names, last_names, run").eq("id", studentId).maybeSingle();
  if (!student) return null;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id, courses(level, letter)")
    .eq("student_id", studentId)
    .eq("status", "activa")
    .maybeSingle();
  const course = enrollment?.courses as unknown as { level: string; letter: string } | null;

  const year = range.to.slice(0, 4);
  const today = new Date(range.to + "T00:00:00");
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const last30Start = new Date(today);
  last30Start.setDate(last30Start.getDate() - 29);
  const prev30End = new Date(last30Start);
  prev30End.setDate(prev30End.getDate() - 1);
  const prev30Start = new Date(prev30End);
  prev30Start.setDate(prev30Start.getDate() - 29);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [rawYearRows, historyRows, rawLast30Rows, rawPrev30Rows, observationRows] = await Promise.all([
    fetchAttendanceRows(supabase, { studentId, from: `${year}-01-01`, to: `${year}-12-31` }),
    fetchAttendanceRows(supabase, { studentId, from: range.from, to: range.to }),
    fetchAttendanceRows(supabase, { studentId, from: iso(last30Start), to: range.to }),
    fetchAttendanceRows(supabase, { studentId, from: iso(prev30Start), to: iso(prev30End) }),
    supabase.from("attendance").select("date, status, observation").eq("student_id", studentId).gte("date", range.from).lte("date", range.to).order("date", { ascending: false }),
  ]);

  // El alcance de exclusión es el curso actual del estudiante -- si no tiene
  // matrícula activa (retirado), no hay curso al que atar una suspensión y
  // no se filtra nada (conservador: no se inventa un curso).
  const excludedByCourse = enrollment?.course_id
    ? await getExcludedDatesByCourse([enrollment.course_id], `${year}-01-01`, `${year}-12-31`)
    : new Map<string, Set<string>>();
  const excludedDates = excludedByCourse.get(enrollment?.course_id ?? "") ?? new Set<string>();

  const yearRows = filterExcludedRows(rawYearRows, excludedByCourse);
  const last30Rows = filterExcludedRows(rawLast30Rows, excludedByCourse);
  const prev30Rows = filterExcludedRows(rawPrev30Rows, excludedByCourse);

  const yearCounts = yearRows.reduce((acc, r) => addCount(acc, r.status), EMPTY_COUNTS);
  const monthCounts = yearRows.filter((r) => new Date(r.date + "T00:00:00") >= monthStart).reduce((acc, r) => addCount(acc, r.status), EMPTY_COUNTS);
  const weekCounts = yearRows.filter((r) => new Date(r.date + "T00:00:00") >= weekStart).reduce((acc, r) => addCount(acc, r.status), EMPTY_COUNTS);
  const last30Counts = last30Rows.reduce((acc, r) => addCount(acc, r.status), EMPTY_COUNTS);
  const prev30Counts = prev30Rows.reduce((acc, r) => addCount(acc, r.status), EMPTY_COUNTS);

  const lastAbsence = yearRows.filter((r) => r.status === "ausente").sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null;

  const observationByDate = new Map((observationRows.data ?? []).map((r) => [r.date, r.observation]));
  const history = historyRows
    .map((r) => ({ date: r.date, status: r.status, observation: observationByDate.get(r.date) ?? null, excluded: excludedDates.has(r.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const rate = computeRate(yearCounts);

  return {
    studentId,
    fullName: `${student.last_names}, ${student.first_names}`,
    run: student.run,
    courseId: enrollment?.course_id ?? null,
    courseLabel: course ? `${course.level} ${course.letter}`.trim() : null,
    yearRate: rate,
    monthRate: computeRate(monthCounts),
    weekRate: computeRate(weekCounts),
    counts: yearCounts,
    history,
    monthlyEvolution: monthlyEvolutionFromRows(yearRows),
    trend: computeTrend(computeRate(last30Counts), computeRate(prev30Counts)),
    lastAbsence,
    semaforo: getSemaforo(rate, thresholds),
  };
}

// ---------------------------------------------------------------------------
// Seguimiento / alertas
// ---------------------------------------------------------------------------
export interface FollowupFilters {
  maxRate?: number; // bajo X% (90 | 85 | 80 | umbral configurado)
  minConsecutiveAbsences?: number;
  mondayFridayOnly?: boolean;
}

export interface FollowupRow {
  studentId: string;
  fullName: string;
  courseId: string;
  courseLabel: string;
  rate: number | null;
  absences: number;
  consecutiveAbsences: number;
  mondayFridayAbsences: number;
  lastPresence: string | null;
  semaforo: SemaforoLevel;
}

/** Racha de ausencias consecutivas más reciente, contando solo días con registro (no calendario) -- coherente con que no existe tabla de días lectivos. */
function longestRecentAbsenceStreak(datesSortedDesc: { date: string; status: AttendanceStatus }[]): number {
  let streak = 0;
  for (const d of datesSortedDesc) {
    if (d.status === "ausente") streak++;
    else break;
  }
  return streak;
}

export async function getFollowupList(courseIds: string[], range: DateRange, thresholds: AttendanceThresholds, filters: FollowupFilters): Promise<FollowupRow[]> {
  if (courseIds.length === 0) return [];
  const supabase = await createClient();

  const [{ data: courses }, rawRows, excludedByCourse] = await Promise.all([
    supabase.from("courses").select("id, level, letter").in("id", courseIds),
    fetchAttendanceRows(supabase, { courseIds, from: range.from, to: range.to }),
    getExcludedDatesByCourse(courseIds, range.from, range.to),
  ]);
  const rows = filterExcludedRows(rawRows, excludedByCourse);
  const courseLabelById = new Map((courses ?? []).map((c) => [c.id, `${c.level} ${c.letter}`.trim()]));

  const byStudent = groupByStudent(rows);
  if (byStudent.size === 0) return [];

  const studentIds = Array.from(byStudent.keys());
  const { data: studentRows } = await supabase.from("students").select("id, first_names, last_names").in("id", studentIds);
  const nameById = new Map((studentRows ?? []).map((s) => [s.id, `${s.last_names}, ${s.first_names}`]));

  const maxRate = filters.maxRate ?? thresholds.yellow;
  const result: FollowupRow[] = [];

  for (const [studentId, entry] of byStudent) {
    const rate = computeRate(entry.counts);
    if (rate === null || rate >= maxRate) continue;

    const sortedDesc = [...entry.dates].sort((a, b) => b.date.localeCompare(a.date));
    const consecutiveAbsences = longestRecentAbsenceStreak(sortedDesc);
    const mondayFridayAbsences = entry.dates.filter((d) => d.status === "ausente" && [1, 5].includes(new Date(d.date + "T00:00:00").getDay())).length;
    const lastPresence = entry.dates.filter((d) => d.status === "presente" || d.status === "atraso").sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null;

    if (filters.minConsecutiveAbsences && consecutiveAbsences < filters.minConsecutiveAbsences) continue;
    if (filters.mondayFridayOnly && mondayFridayAbsences === 0) continue;

    result.push({
      studentId,
      fullName: nameById.get(studentId) ?? "—",
      courseId: entry.courseId,
      courseLabel: courseLabelById.get(entry.courseId) ?? "—",
      rate,
      absences: entry.counts.ausente,
      consecutiveAbsences,
      mondayFridayAbsences,
      lastPresence,
      semaforo: getSemaforo(rate, thresholds),
    });
  }

  return result.sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
}

// ---------------------------------------------------------------------------
// Resumen para "Administrar calendario" (asistencia/administracion)
// ---------------------------------------------------------------------------
export interface AttendanceCalendarSummary {
  diasLectivosProgramados: number; // trabajados + suspendidos (lo que el calendario efectivo registra para el período)
  diasTrabajados: number;
  diasSuspendidos: number;
  diasRecuperados: number;
}

export async function getAttendanceCalendarSummary(courseIds: string[], range: DateRange): Promise<AttendanceCalendarSummary> {
  if (courseIds.length === 0) return { diasLectivosProgramados: 0, diasTrabajados: 0, diasSuspendidos: 0, diasRecuperados: 0 };
  const supabase = await createClient();

  const [rawRows, excludedByCourse, recoveredDates] = await Promise.all([
    fetchAttendanceRows(supabase, { courseIds, from: range.from, to: range.to }),
    getExcludedDatesByCourse(courseIds, range.from, range.to),
    getRecoveredDatesByCourse(courseIds, range.from, range.to),
  ]);

  const workedDates = new Set<string>();
  for (const r of rawRows) {
    if (!excludedByCourse.get(r.course_id)?.has(r.date)) workedDates.add(r.date);
  }

  const suspendedDates = new Set<string>();
  for (const set of excludedByCourse.values()) {
    for (const d of set) suspendedDates.add(d);
  }

  return {
    diasLectivosProgramados: new Set([...workedDates, ...suspendedDates]).size,
    diasTrabajados: workedDates.size,
    diasSuspendidos: suspendedDates.size,
    diasRecuperados: recoveredDates.size,
  };
}
