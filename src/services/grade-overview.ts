import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, roundGrade, computeWeightedAverage } from "@/config/grading";
import type { EvaluationRow } from "@/types/database";

/**
 * Vista de supervisión institucional de Calificaciones (Dirección/UTP):
 * agregados de completitud por curso/asignatura/estudiante, calculados en
 * memoria a partir de matrículas + evaluaciones + notas -- sin tablas ni
 * columnas nuevas, y sin N+1 (2-4 queries por función, igual criterio que
 * report-data.ts / student-attendance.ts). No reemplaza ni reimplementa
 * computeWeightedAverage(): la reusa tal cual, así el promedio mostrado aquí
 * nunca puede diferir del que ve el docente en GradeEntryGrid ni del que
 * usan los Informes.
 */

export interface CourseGradeSummary {
  courseId: string;
  courseLabel: string;
  courseLevel: string;
  courseLetter: string;
  studentCount: number;
  subjectCount: number;
  subjectsComplete: number;
  completionPercent: number | null;
}

interface EvalRow {
  id: string;
  course_id: string;
  subject_id: string;
  name: string;
  weight: number;
}

/** Portada de Calificaciones: una fila por curso, con conteo de asignaturas completas -- sin detalle por asignatura (eso vive en la vista de curso). */
export async function getCourseGradeSummaries(academicYearId: string, periodId?: string): Promise<CourseGradeSummary[]> {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, level, letter")
    .eq("academic_year_id", academicYearId)
    .eq("active", true);
  if (!courses || courses.length === 0) return [];
  const courseIds = courses.map((c) => c.id);

  const [{ data: enrollments }, { data: assignments }, evalResult] = await Promise.all([
    supabase.from("enrollments").select("course_id, student_id").in("course_id", courseIds).eq("status", "activa"),
    supabase.from("teacher_assignments").select("course_id, subject_id").in("course_id", courseIds).eq("active", true),
    (async () => {
      let q = supabase.from("evaluations").select("id, course_id, subject_id, name, weight").in("course_id", courseIds);
      if (periodId) q = q.eq("period_id", periodId);
      return q;
    })(),
  ]);
  const evaluations = (evalResult.data ?? []) as EvalRow[];

  const studentsByCourse = new Map<string, Set<string>>();
  for (const e of enrollments ?? []) {
    const set = studentsByCourse.get(e.course_id) ?? new Set<string>();
    set.add(e.student_id);
    studentsByCourse.set(e.course_id, set);
  }

  const subjectsByCourse = new Map<string, Set<string>>();
  for (const a of assignments ?? []) {
    const set = subjectsByCourse.get(a.course_id) ?? new Set<string>();
    set.add(a.subject_id);
    subjectsByCourse.set(a.course_id, set);
  }

  const evalIds = evaluations.map((e) => e.id);
  const { data: allGrades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, student_id, score").in("evaluation_id", evalIds)
    : { data: [] };
  const gradedByEval = new Map<string, Set<string>>();
  for (const g of allGrades ?? []) {
    if (g.score === null) continue;
    const set = gradedByEval.get(g.evaluation_id) ?? new Set<string>();
    set.add(g.student_id);
    gradedByEval.set(g.evaluation_id, set);
  }

  return courses.map((course) => {
    const students = studentsByCourse.get(course.id) ?? new Set<string>();
    const subjects = subjectsByCourse.get(course.id) ?? new Set<string>();
    let subjectsComplete = 0;

    for (const subjectId of subjects) {
      const subjectEvals = evaluations.filter((e) => e.course_id === course.id && e.subject_id === subjectId);
      if (subjectEvals.length === 0 || students.size === 0) continue;
      const allGraded = subjectEvals.every((ev) => {
        const graded = gradedByEval.get(ev.id);
        if (!graded) return false;
        for (const studentId of students) if (!graded.has(studentId)) return false;
        return true;
      });
      if (allGraded) subjectsComplete++;
    }

    return {
      courseId: course.id,
      courseLabel: `${course.level} ${course.letter}`.trim(),
      courseLevel: course.level,
      courseLetter: course.letter,
      studentCount: students.size,
      subjectCount: subjects.size,
      subjectsComplete,
      completionPercent: subjects.size > 0 ? Math.round((subjectsComplete / subjects.size) * 100) : null,
    };
  });
}

export interface SubjectGradeSummary {
  subjectId: string;
  subjectName: string;
  evaluationCount: number;
  studentsComplete: number;
  studentsPending: number;
  status: "sin_evaluaciones" | "completo" | "pendiente";
}

export interface CourseGradeDetail {
  courseId: string;
  courseLabel: string;
  studentCount: number;
  subjects: SubjectGradeSummary[];
}

/** Vista de curso: desglose por asignatura (completo/pendiente/sin evaluaciones), sin duplicar la fórmula de promedios -- solo cuenta notas presentes vs. esperadas. */
export async function getCourseGradeDetail(courseId: string, academicYearId: string, periodId?: string): Promise<CourseGradeDetail | null> {
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, level, letter").eq("id", courseId).maybeSingle();
  if (!course) return null;

  const [{ data: enrollments }, { data: assignments }, evalResult] = await Promise.all([
    supabase.from("enrollments").select("student_id").eq("course_id", courseId).eq("academic_year_id", academicYearId).eq("status", "activa"),
    supabase.from("teacher_assignments").select("subject_id, subjects(id, name)").eq("course_id", courseId).eq("active", true),
    (async () => {
      let q = supabase.from("evaluations").select("id, subject_id, name, weight").eq("course_id", courseId);
      if (periodId) q = q.eq("period_id", periodId);
      return q;
    })(),
  ]);

  const studentIds = (enrollments ?? []).map((e) => e.student_id);
  const evaluations = (evalResult.data ?? []) as { id: string; subject_id: string; name: string; weight: number }[];
  const evalIds = evaluations.map((e) => e.id);

  const { data: allGrades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, student_id, score").in("evaluation_id", evalIds)
    : { data: [] };
  const gradedByEval = new Map<string, Set<string>>();
  for (const g of allGrades ?? []) {
    if (g.score === null) continue;
    const set = gradedByEval.get(g.evaluation_id) ?? new Set<string>();
    set.add(g.student_id);
    gradedByEval.set(g.evaluation_id, set);
  }

  type AssignmentJoin = { subject_id: string; subjects: { id: string; name: string } | null };
  const subjectEntries = new Map<string, string>();
  for (const a of (assignments ?? []) as unknown as AssignmentJoin[]) {
    if (a.subjects) subjectEntries.set(a.subject_id, a.subjects.name);
  }

  const subjects: SubjectGradeSummary[] = Array.from(subjectEntries, ([subjectId, subjectName]) => {
    const subjectEvals = evaluations.filter((e) => e.subject_id === subjectId);
    let studentsComplete = 0;
    if (subjectEvals.length > 0) {
      for (const studentId of studentIds) {
        const complete = subjectEvals.every((ev) => gradedByEval.get(ev.id)?.has(studentId));
        if (complete) studentsComplete++;
      }
    }
    const status: SubjectGradeSummary["status"] =
      subjectEvals.length === 0 ? "sin_evaluaciones" : studentsComplete === studentIds.length && studentIds.length > 0 ? "completo" : "pendiente";
    return {
      subjectId,
      subjectName,
      evaluationCount: subjectEvals.length,
      studentsComplete,
      studentsPending: studentIds.length - studentsComplete,
      status,
    };
  }).sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  return {
    courseId: course.id,
    courseLabel: `${course.level} ${course.letter}`.trim(),
    studentCount: studentIds.length,
    subjects,
  };
}

export interface StudentGradeRow {
  studentId: string;
  studentName: string;
  scores: Record<string, number | null>;
  average: number | null;
  missingEvaluationNames: string[];
  status: "completo" | "pendiente" | "sin_notas";
}

export interface SubjectGradeMatrix {
  courseId: string;
  courseLabel: string;
  subjectId: string;
  subjectName: string;
  evaluations: { id: string; name: string }[];
  students: StudentGradeRow[];
  studentsComplete: number;
  studentsPending: number;
  courseAverage: number | null;
  completionPercent: number | null;
}

/** Vista de asignatura: matriz estudiante x evaluación (nombres reales), con detalle de qué falta por estudiante. */
export async function getSubjectGradeMatrix(
  courseId: string,
  subjectId: string,
  academicYearId: string,
  periodId?: string
): Promise<SubjectGradeMatrix | null> {
  const supabase = await createClient();

  const [{ data: course }, { data: subject }] = await Promise.all([
    supabase.from("courses").select("level, letter").eq("id", courseId).maybeSingle(),
    supabase.from("subjects").select("name").eq("id", subjectId).maybeSingle(),
  ]);
  if (!course || !subject) return null;

  const [{ data: enrollments }, evalResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id, students(id, first_names, last_names, run)")
      .eq("course_id", courseId)
      .eq("academic_year_id", academicYearId)
      .eq("status", "activa"),
    (async () => {
      let q = supabase.from("evaluations").select("id, name, weight").eq("course_id", courseId).eq("subject_id", subjectId);
      if (periodId) q = q.eq("period_id", periodId);
      return q.order("eval_date", { ascending: true });
    })(),
  ]);

  type EnrollmentJoin = { student_id: string; students: { id: string; first_names: string; last_names: string; run: string } | null };
  const students = ((enrollments ?? []) as unknown as EnrollmentJoin[])
    .filter((e) => e.students)
    .sort((a, b) => a.students!.last_names.localeCompare(b.students!.last_names) || a.students!.first_names.localeCompare(b.students!.first_names));

  const evaluations = (evalResult.data ?? []) as { id: string; name: string; weight: number }[];
  const evalIds = evaluations.map((e) => e.id);

  const { data: allGrades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, student_id, score").in("evaluation_id", evalIds)
    : { data: [] };
  const scoresByStudent = new Map<string, Map<string, number | null>>();
  for (const g of allGrades ?? []) {
    const m = scoresByStudent.get(g.student_id) ?? new Map<string, number | null>();
    m.set(g.evaluation_id, g.score);
    scoresByStudent.set(g.student_id, m);
  }

  let studentsComplete = 0;
  const studentRows: StudentGradeRow[] = students.map((e) => {
    const s = e.students!;
    const studentScores = scoresByStudent.get(s.id) ?? new Map<string, number | null>();
    const scores: Record<string, number | null> = {};
    const missing: string[] = [];
    let anyScore = false;
    for (const ev of evaluations) {
      const score = studentScores.get(ev.id) ?? null;
      scores[ev.id] = score;
      if (score === null) missing.push(ev.name);
      else anyScore = true;
    }
    const average = computeWeightedAverage(
      evaluations.map((ev) => ({ score: scores[ev.id], weight: ev.weight })),
      DEFAULT_GRADING_CONFIG
    );
    const status: StudentGradeRow["status"] = evaluations.length === 0 ? "sin_notas" : missing.length === 0 ? "completo" : anyScore ? "pendiente" : "sin_notas";
    if (status === "completo") studentsComplete++;
    return { studentId: s.id, studentName: `${s.first_names} ${s.last_names}`, scores, average, missingEvaluationNames: missing, status };
  });

  const computableAverages = studentRows.map((r) => r.average).filter((a): a is number => a !== null);
  const courseAverage = computableAverages.length
    ? roundGrade(computableAverages.reduce((a, b) => a + b, 0) / computableAverages.length, DEFAULT_GRADING_CONFIG)
    : null;

  return {
    courseId,
    courseLabel: `${course.level} ${course.letter}`.trim(),
    subjectId,
    subjectName: subject.name,
    evaluations: evaluations.map((e) => ({ id: e.id, name: e.name })),
    students: studentRows,
    studentsComplete,
    studentsPending: studentRows.length - studentsComplete,
    courseAverage,
    completionPercent: evaluations.length > 0 && studentRows.length > 0 ? Math.round((studentsComplete / studentRows.length) * 100) : null,
  };
}

export interface EvaluationListItem {
  id: string;
  name: string;
  evalType: string;
  weight: number;
  evalDate: string | null;
  description: string | null;
  status: EvaluationRow["status"];
  gradedCount: number;
  studentCount: number;
}

export interface CourseSubjectEvaluations {
  courseId: string;
  courseLabel: string;
  subjectId: string;
  subjectName: string;
  evaluations: EvaluationListItem[];
}

/** Listado administrable de evaluaciones de un curso+asignatura (+ período opcional) -- para "Gestionar evaluaciones" (crear/editar/eliminar), no la matriz de solo lectura. */
export async function getCourseSubjectEvaluations(
  courseId: string,
  subjectId: string,
  periodId?: string
): Promise<CourseSubjectEvaluations | null> {
  const supabase = await createClient();

  const [{ data: course }, { data: subject }] = await Promise.all([
    supabase.from("courses").select("level, letter").eq("id", courseId).maybeSingle(),
    supabase.from("subjects").select("name").eq("id", subjectId).maybeSingle(),
  ]);
  if (!course || !subject) return null;

  const { count: studentCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("status", "activa");

  let evalQuery = supabase
    .from("evaluations")
    .select("id, name, eval_type, weight, eval_date, description, status")
    .eq("course_id", courseId)
    .eq("subject_id", subjectId);
  if (periodId) evalQuery = evalQuery.eq("period_id", periodId);
  const { data: evaluations } = await evalQuery.order("eval_date", { ascending: true });

  const evalIds = (evaluations ?? []).map((e) => e.id);
  const { data: allGrades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, score").in("evaluation_id", evalIds)
    : { data: [] };
  const gradedCountByEval = new Map<string, number>();
  for (const g of allGrades ?? []) {
    if (g.score === null) continue;
    gradedCountByEval.set(g.evaluation_id, (gradedCountByEval.get(g.evaluation_id) ?? 0) + 1);
  }

  return {
    courseId,
    courseLabel: `${course.level} ${course.letter}`.trim(),
    subjectId,
    subjectName: subject.name,
    evaluations: (evaluations ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      evalType: e.eval_type,
      weight: e.weight,
      evalDate: e.eval_date,
      description: e.description,
      status: e.status,
      gradedCount: gradedCountByEval.get(e.id) ?? 0,
      studentCount: studentCount ?? 0,
    })),
  };
}

export interface EvaluationGradeSheetRow {
  studentId: string;
  studentName: string;
  studentRun: string;
  gradeId: string | null;
  score: number | null;
  observation: string | null;
}

export interface EvaluationGradeSheet {
  evaluationId: string;
  evaluationName: string;
  courseId: string;
  courseLabel: string;
  subjectId: string;
  subjectName: string;
  status: EvaluationRow["status"];
  rows: EvaluationGradeSheetRow[];
}

/** Datos de la planilla administrativa de UNA evaluación -- todos los estudiantes con matrícula activa del curso, con su nota actual (si existe). */
export async function getEvaluationGradeSheet(evaluationId: string, academicYearId: string): Promise<EvaluationGradeSheet | null> {
  const supabase = await createClient();

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, name, status, course_id, subject_id, courses(level, letter), subjects(name)")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation) return null;

  type EvalJoin = {
    id: string;
    name: string;
    status: EvaluationRow["status"];
    course_id: string;
    subject_id: string;
    courses: { level: string; letter: string } | null;
    subjects: { name: string } | null;
  };
  const ev = evaluation as unknown as EvalJoin;

  const [{ data: enrollments }, { data: grades }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id, students(id, first_names, last_names, run)")
      .eq("course_id", ev.course_id)
      .eq("academic_year_id", academicYearId)
      .eq("status", "activa"),
    supabase.from("grades").select("id, student_id, score, observation").eq("evaluation_id", evaluationId),
  ]);

  type EnrollmentJoin = { student_id: string; students: { id: string; first_names: string; last_names: string; run: string } | null };
  const students = ((enrollments ?? []) as unknown as EnrollmentJoin[])
    .filter((e) => e.students)
    .sort((a, b) => a.students!.last_names.localeCompare(b.students!.last_names) || a.students!.first_names.localeCompare(b.students!.first_names));

  const gradeByStudent = new Map((grades ?? []).map((g) => [g.student_id, g]));

  return {
    evaluationId: ev.id,
    evaluationName: ev.name,
    courseId: ev.course_id,
    courseLabel: ev.courses ? `${ev.courses.level} ${ev.courses.letter}`.trim() : "",
    subjectId: ev.subject_id,
    subjectName: ev.subjects?.name ?? "",
    status: ev.status,
    rows: students.map((e) => {
      const s = e.students!;
      const grade = gradeByStudent.get(s.id);
      return {
        studentId: s.id,
        studentName: `${s.first_names} ${s.last_names}`,
        studentRun: s.run,
        gradeId: grade?.id ?? null,
        score: grade?.score ?? null,
        observation: grade?.observation ?? null,
      };
    }),
  };
}
