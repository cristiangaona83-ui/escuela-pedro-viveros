import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, roundGrade, computeWeightedAverage } from "@/config/grading";
import type { SubjectAverageRow } from "@/lib/pdf/OfficialCertificateShared";

export interface StudentReportData {
  studentId: string;
  studentName: string;
  studentRun: string;
  courseLabel: string;
  courseLevel: string;
  courseLetter: string;
  courseId: string;
  rows: SubjectAverageRow[];
  generalAverage: number | null;
}

interface EvaluationRow {
  id: string;
  subject_id: string;
  weight: number;
  subjects: { name: string } | null;
}

/** Promedio por asignatura a partir de las evaluaciones de un curso/período y las notas de UN estudiante -- misma fórmula para el informe individual y el masivo, para que nunca muestren números distintos. */
function aggregateSubjectRows(evaluations: EvaluationRow[], scoreByEvalId: Map<string, number | null>): SubjectAverageRow[] {
  const bySubject = new Map<string, { name: string; scores: { score: number | null; weight: number }[] }>();
  for (const e of evaluations) {
    const entry = bySubject.get(e.subject_id) ?? { name: e.subjects?.name ?? "Asignatura", scores: [] };
    entry.scores.push({ score: scoreByEvalId.get(e.id) ?? null, weight: e.weight });
    bySubject.set(e.subject_id, entry);
  }
  return Array.from(bySubject.values())
    .map((s) => ({ subjectName: s.name, average: computeWeightedAverage(s.scores, DEFAULT_GRADING_CONFIG) }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

function generalAverageFromRows(rows: SubjectAverageRow[]): number | null {
  const validAverages = rows.map((r) => r.average).filter((a): a is number => a !== null);
  return validAverages.length ? roundGrade(validAverages.reduce((a, b) => a + b, 0) / validAverages.length, DEFAULT_GRADING_CONFIG) : null;
}

export async function getStudentSubjectAverages(
  studentId: string,
  academicYearId: string,
  periodId?: string
): Promise<StudentReportData | null> {
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("first_names, last_names, run").eq("id", studentId).maybeSingle();
  if (!student) return null;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("courses(id, level, letter)")
    .eq("student_id", studentId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  const course = (enrollment as unknown as { courses: { id: string; level: string; letter: string } | null } | null)?.courses;
  if (!course) return null;

  let evalQuery = supabase
    .from("evaluations")
    .select("id, subject_id, weight, subjects(name)")
    .eq("course_id", course.id);
  if (periodId) evalQuery = evalQuery.eq("period_id", periodId);
  const { data: evaluations } = await evalQuery;
  const evaluationRows = (evaluations ?? []) as unknown as EvaluationRow[];

  const evalIds = evaluationRows.map((e) => e.id);
  const { data: grades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, score").eq("student_id", studentId).in("evaluation_id", evalIds)
    : { data: [] };

  const scoreByEval = new Map((grades ?? []).map((g) => [g.evaluation_id, g.score]));
  const rows = aggregateSubjectRows(evaluationRows, scoreByEval);
  const generalAverage = generalAverageFromRows(rows);

  return {
    studentId,
    studentName: `${student.first_names} ${student.last_names}`,
    studentRun: student.run,
    courseLabel: `${course.level} ${course.letter}`,
    courseLevel: course.level,
    courseLetter: course.letter,
    courseId: course.id,
    rows,
    generalAverage,
  };
}

/**
 * Igual que getStudentSubjectAverages, pero para TODOS los estudiantes con
 * matrícula activa de un curso a la vez -- evaluaciones y notas del curso
 * completo en 2 consultas (no una por estudiante), para la nómina e
 * impresión masiva de Informes. Orden alfabético por apellido/nombre (no
 * existe hoy un campo de orden de nómina en enrollments -- mismo criterio
 * ya usado en el resto de la plataforma, ej. CourseStudentTable).
 */
export async function getCourseSubjectAverages(
  courseId: string,
  academicYearId: string,
  periodId?: string
): Promise<StudentReportData[]> {
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, level, letter").eq("id", courseId).maybeSingle();
  if (!course) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_names, last_names, run)")
    .eq("course_id", courseId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "activa");

  type EnrollmentJoin = { student_id: string; students: { id: string; first_names: string; last_names: string; run: string } | null };
  const students = ((enrollments ?? []) as unknown as EnrollmentJoin[]).filter((e) => e.students);
  if (students.length === 0) return [];

  let evalQuery = supabase.from("evaluations").select("id, subject_id, weight, subjects(name)").eq("course_id", courseId);
  if (periodId) evalQuery = evalQuery.eq("period_id", periodId);
  const { data: evaluations } = await evalQuery;
  const evaluationRows = (evaluations ?? []) as unknown as EvaluationRow[];
  const evalIds = evaluationRows.map((e) => e.id);

  const { data: allGrades } = evalIds.length
    ? await supabase.from("grades").select("student_id, evaluation_id, score").in("evaluation_id", evalIds)
    : { data: [] };

  const scoresByStudent = new Map<string, Map<string, number | null>>();
  for (const g of allGrades ?? []) {
    const m = scoresByStudent.get(g.student_id) ?? new Map<string, number | null>();
    m.set(g.evaluation_id, g.score);
    scoresByStudent.set(g.student_id, m);
  }

  const courseLabel = `${course.level} ${course.letter}`.trim();

  return students
    .slice()
    .sort((a, b) => a.students!.last_names.localeCompare(b.students!.last_names) || a.students!.first_names.localeCompare(b.students!.first_names))
    .map((e) => {
      const s = e.students!;
      const rows = aggregateSubjectRows(evaluationRows, scoresByStudent.get(s.id) ?? new Map());
      return {
        studentId: s.id,
        studentName: `${s.first_names} ${s.last_names}`,
        studentRun: s.run,
        courseLabel,
        courseLevel: course.level,
        courseLetter: course.letter,
        courseId: course.id,
        rows,
        generalAverage: generalAverageFromRows(rows),
      };
    });
}
