import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/services/courses";
import { listOpenPeriods } from "@/services/academic-scope";
import { getCourseGradeSummaries } from "@/services/grade-overview";
import { getCourseSubjectAverages } from "@/services/report-data";
import { isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { DEFAULT_GRADING_CONFIG, roundGrade } from "@/config/grading";

/**
 * Indicadores + alertas del Panel General de Gestión Pedagógica -- todo
 * calculado desde tablas ya existentes (nada inventado, ninguna tabla
 * nueva). Reutiliza servicios ya probados en vez de reimplementar su
 * lógica: `getCourseGradeSummaries` (completitud por curso, ya usado en
 * Calificaciones) y `getCourseSubjectAverages` (promedio general por
 * estudiante, el mismo que usan los Informes) -- así los números de este
 * panel nunca pueden divergir de los que ve UTP en esos módulos.
 *
 * El promedio por curso y "informes pendientes" solo se calculan para
 * cursos de Enseñanza Básica (igual restricción que el módulo de
 * Informes) y sobre el período abierto actual -- si no hay un período
 * abierto, esos dos números quedan en null/0 en vez de adivinar.
 */

export interface PedagogicalAlert {
  key: string;
  label: string;
  count: number;
  tone: "warning" | "danger";
}

export interface CourseAverageRow {
  courseId: string;
  courseLabel: string;
  average: number | null;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  module: string | null;
  createdAt: string;
  userName: string | null;
}

export interface PedagogicalDashboard {
  activeCourses: number;
  totalEnrollment: number;
  teacherCount: number;
  subjectCount: number;
  evaluationsRegistered: number;
  evaluationsPending: number;
  gradeCompletionPercent: number | null;
  coursesWithIncompleteRecords: number;
  courseAverages: CourseAverageRow[];
  alerts: PedagogicalAlert[];
  recentActivity: RecentActivityItem[];
}

const RECENT_EVALUATION_WINDOW_DAYS = 30;
// "evaluaciones" no es un valor de p_module real: crear/editar/eliminar una
// evaluación registra module="calificaciones" (ver EvaluationFormModal,
// DeleteEvaluationDialog) -- solo estos dos módulos existen en la práctica.
const AUDIT_MODULES = ["calificaciones", "informes"];

function emptyDashboard(): PedagogicalDashboard {
  return {
    activeCourses: 0,
    totalEnrollment: 0,
    teacherCount: 0,
    subjectCount: 0,
    evaluationsRegistered: 0,
    evaluationsPending: 0,
    gradeCompletionPercent: null,
    coursesWithIncompleteRecords: 0,
    courseAverages: [],
    alerts: [],
    recentActivity: [],
  };
}

export async function getPedagogicalDashboard(): Promise<PedagogicalDashboard> {
  const supabase = await createClient();
  const year = await getActiveAcademicYear();
  if (!year) return emptyDashboard();

  const [{ data: courses }, { data: enrollments }, { data: assignments }, { count: subjectCount }, evalResult, courseSummaries, periods, activityResult] =
    await Promise.all([
      supabase.from("courses").select("id, level, letter").eq("academic_year_id", year.id).eq("active", true),
      supabase.from("enrollments").select("student_id, course_id").eq("academic_year_id", year.id).eq("status", "activa"),
      supabase.from("teacher_assignments").select("teacher_id").eq("academic_year_id", year.id).eq("active", true),
      supabase.from("subjects").select("id", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("evaluations")
        .select("id, status, course_id, teacher_id, eval_date, academic_periods!inner(academic_year_id)")
        .eq("academic_periods.academic_year_id", year.id),
      getCourseGradeSummaries(year.id),
      listOpenPeriods(),
      supabase
        .from("audit_logs")
        .select("id, action, module, created_at, profiles(full_name)")
        .in("module", AUDIT_MODULES)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const courseRows = courses ?? [];
  const evaluations = (evalResult.data ?? []) as { id: string; status: string; course_id: string; teacher_id: string | null; eval_date: string | null }[];
  const evalIds = evaluations.map((e) => e.id);

  const { data: grades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, student_id, score").in("evaluation_id", evalIds)
    : { data: [] };

  const gradedEvalIds = new Set<string>();
  const studentIdsWithGrades = new Set<string>();
  for (const g of grades ?? []) {
    if (g.score === null) continue;
    gradedEvalIds.add(g.evaluation_id);
    studentIdsWithGrades.add(g.student_id);
  }

  const evaluationsPending = evaluations.filter((e) => e.status === "borrador" || e.status === "planificada").length;
  const evaluationsSinCalificar = evaluations.filter((e) => (e.status === "aplicada" || e.status === "cerrada") && !gradedEvalIds.has(e.id));
  const docentesConPendientes = new Set(evaluationsSinCalificar.map((e) => e.teacher_id).filter((id): id is string => id !== null));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_EVALUATION_WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const coursesWithRecentEval = new Set(evaluations.filter((e) => e.eval_date && e.eval_date >= cutoffStr).map((e) => e.course_id));
  const cursosSinEvaluacionesRecientes = courseRows.filter((c) => !coursesWithRecentEval.has(c.id)).length;

  const activeStudentIds = new Set((enrollments ?? []).map((e) => e.student_id));
  const estudiantesSinNotas = [...activeStudentIds].filter((id) => !studentIdsWithGrades.has(id)).length;

  const coursesWithSubjects = courseSummaries.filter((c) => c.subjectCount > 0);
  const coursesWithIncompleteRecords = coursesWithSubjects.filter((c) => (c.completionPercent ?? 0) < 100).length;
  const asignaturasIncompletas = courseSummaries.reduce((sum, c) => sum + (c.subjectCount - c.subjectsComplete), 0);
  const totalSubjectSlots = coursesWithSubjects.reduce((sum, c) => sum + c.subjectCount, 0);
  const totalSubjectsComplete = coursesWithSubjects.reduce((sum, c) => sum + c.subjectsComplete, 0);
  const gradeCompletionPercent = totalSubjectSlots > 0 ? Math.round((totalSubjectsComplete / totalSubjectSlots) * 100) : null;

  // Promedio por curso e informes pendientes -- solo Enseñanza Básica, solo si hay un período abierto (si no, no se puede saber "el informe del semestre actual").
  const yearPeriods = periods.filter((p) => p.academic_year_id === year.id);
  const currentPeriod = yearPeriods.find((p) => p.status === "abierto") ?? null;
  const basicaCourses = courseRows.filter((c) => isEnsenanzaBasica(c.level));

  let courseAverages: CourseAverageRow[] = [];
  let informesPendientes = 0;
  if (currentPeriod && basicaCourses.length > 0) {
    const reports = await Promise.all(basicaCourses.map((c) => getCourseSubjectAverages(c.id, year.id, currentPeriod.id)));
    courseAverages = basicaCourses.map((c, i) => {
      const rows = reports[i];
      const averages = rows.map((r) => r.generalAverage).filter((a): a is number => a !== null);
      const average = averages.length ? roundGrade(averages.reduce((a, b) => a + b, 0) / averages.length, DEFAULT_GRADING_CONFIG) : null;
      informesPendientes += rows.filter((r) => r.generalAverage === null).length;
      return { courseId: c.id, courseLabel: `${c.level} ${c.letter}`.trim(), average };
    });
  }

  const allAlerts: PedagogicalAlert[] = [
    { key: "evaluaciones_sin_calificar", label: "Evaluaciones aplicadas sin calificar", count: evaluationsSinCalificar.length, tone: "warning" },
    { key: "cursos_sin_evaluaciones_recientes", label: `Cursos sin evaluaciones en los últimos ${RECENT_EVALUATION_WINDOW_DAYS} días`, count: cursosSinEvaluacionesRecientes, tone: "warning" },
    { key: "asignaturas_incompletas", label: "Asignaturas con calificaciones incompletas", count: asignaturasIncompletas, tone: "warning" },
    { key: "estudiantes_sin_notas", label: "Estudiantes sin ninguna calificación este año", count: estudiantesSinNotas, tone: "danger" },
    { key: "docentes_con_pendientes", label: "Docentes con evaluaciones por calificar", count: docentesConPendientes.size, tone: "warning" },
  ];
  if (currentPeriod) {
    allAlerts.push({ key: "informes_pendientes", label: "Informes del período actual pendientes", count: informesPendientes, tone: "warning" });
  }
  const alerts = allAlerts.filter((a) => a.count > 0);

  const recentActivity: RecentActivityItem[] = ((activityResult.data ?? []) as unknown as {
    id: string;
    action: string;
    module: string | null;
    created_at: string;
    profiles: { full_name: string } | null;
  }[]).map((r) => ({ id: r.id, action: r.action, module: r.module, createdAt: r.created_at, userName: r.profiles?.full_name ?? null }));

  return {
    activeCourses: courseRows.length,
    totalEnrollment: activeStudentIds.size,
    teacherCount: new Set((assignments ?? []).map((a) => a.teacher_id)).size,
    subjectCount: subjectCount ?? 0,
    evaluationsRegistered: evaluations.length,
    evaluationsPending,
    gradeCompletionPercent,
    coursesWithIncompleteRecords,
    courseAverages,
    alerts,
    recentActivity,
  };
}
