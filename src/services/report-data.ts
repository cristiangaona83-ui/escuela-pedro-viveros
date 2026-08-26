import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, roundGrade, computeWeightedAverage } from "@/config/grading";
import type { SubjectAverageRow } from "@/lib/pdf/OfficialCertificateShared";

export interface StudentReportData {
  studentName: string;
  studentRun: string;
  courseLabel: string;
  courseLevel: string;
  courseLetter: string;
  courseId: string;
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

  const bySubject = new Map<string, { name: string; scores: { score: number | null; weight: number }[] }>();
  for (const ev of evaluations ?? []) {
    const e = ev as unknown as { id: string; subject_id: string; weight: number; subjects: { name: string } | null };
    const entry = bySubject.get(e.subject_id) ?? { name: e.subjects?.name ?? "Asignatura", scores: [] };
    entry.scores.push({ score: scoreByEval.get(e.id) ?? null, weight: e.weight });
    bySubject.set(e.subject_id, entry);
  }

  const rows: SubjectAverageRow[] = Array.from(bySubject.values())
    .map((s) => ({
      subjectName: s.name,
      average: computeWeightedAverage(s.scores, DEFAULT_GRADING_CONFIG),
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
    courseLevel: course.level,
    courseLetter: course.letter,
    courseId: course.id,
    rows,
    generalAverage,
  };
}
