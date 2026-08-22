import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, roundGrade } from "@/config/grading";
import type { SubjectAverageRow } from "@/lib/pdf/GradesReportDocument";

export interface StudentReportData {
  studentName: string;
  studentRun: string;
  courseLabel: string;
  rows: SubjectAverageRow[];
  generalAverage: number | null;
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

  const evalIds = (evaluations ?? []).map((e) => e.id);
  const { data: grades } = evalIds.length
    ? await supabase.from("grades").select("evaluation_id, score").eq("student_id", studentId).in("evaluation_id", evalIds)
    : { data: [] };

  const scoreByEval = new Map((grades ?? []).map((g) => [g.evaluation_id, g.score]));

  const bySubject = new Map<string, { name: string; weightedSum: number; totalWeight: number }>();
  for (const ev of evaluations ?? []) {
    const e = ev as unknown as { id: string; subject_id: string; weight: number; subjects: { name: string } | null };
    const score = scoreByEval.get(e.id);
    if (score === null || score === undefined) continue;
    const entry = bySubject.get(e.subject_id) ?? { name: e.subjects?.name ?? "Asignatura", weightedSum: 0, totalWeight: 0 };
    entry.weightedSum += score * (e.weight || 1);
    entry.totalWeight += e.weight || 1;
    bySubject.set(e.subject_id, entry);
  }

  const rows: SubjectAverageRow[] = Array.from(bySubject.values())
    .map((s) => ({
      subjectName: s.name,
      average: s.totalWeight > 0 ? roundGrade(s.weightedSum / s.totalWeight, DEFAULT_GRADING_CONFIG) : null,
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const validAverages = rows.map((r) => r.average).filter((a): a is number => a !== null);
  const generalAverage = validAverages.length
    ? roundGrade(validAverages.reduce((a, b) => a + b, 0) / validAverages.length, DEFAULT_GRADING_CONFIG)
    : null;

  return {
    studentName: `${student.first_names} ${student.last_names}`,
    studentRun: student.run,
    courseLabel: `${course.level} ${course.letter}`,
    rows,
    generalAverage,
  };
}
