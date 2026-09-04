import { createClient } from "@/lib/supabase/server";
import type { EvaluationListItem } from "@/services/grade-overview";

/**
 * Evaluación enriquecida para /plataforma/evaluaciones -- el listado plano
 * (todos los cursos/asignaturas a la vez, a diferencia de "Gestionar
 * evaluaciones" que ya está acotado a un curso+asignatura). Extiende
 * EvaluationListItem con lo que EvaluationFormModal/DeleteEvaluationDialog
 * ya piden (gradedCount para la protección de 0041, courseId/subjectId/
 * periodId/courseLabel/subjectName), reutilizando esos mismos componentes
 * en vez de duplicar el formulario o el diálogo de eliminación.
 */
export interface AdminEvaluationListItem extends EvaluationListItem {
  courseId: string;
  subjectId: string;
  periodId: string;
  courseLabel: string;
  subjectName: string;
  periodName: string | null;
}

export async function listEvaluations(): Promise<AdminEvaluationListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluations")
    .select(
      "id, course_id, subject_id, period_id, name, eval_type, weight, eval_date, description, status, courses(id, level, letter), subjects(name), academic_periods(name)"
    )
    .order("eval_date", { ascending: false });

  type Row = {
    id: string;
    course_id: string;
    subject_id: string;
    period_id: string;
    name: string;
    eval_type: string;
    weight: number;
    eval_date: string | null;
    description: string | null;
    status: EvaluationListItem["status"];
    courses: { id: string; level: string; letter: string } | null;
    subjects: { name: string } | null;
    academic_periods: { name: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const evalIds = rows.map((r) => r.id);
  const courseIds = Array.from(new Set(rows.map((r) => r.course_id)));

  const [{ data: allGrades }, { data: enrollments }] = await Promise.all([
    supabase.from("grades").select("evaluation_id, score").in("evaluation_id", evalIds),
    supabase.from("enrollments").select("course_id").eq("status", "activa").in("course_id", courseIds),
  ]);

  const gradedCountByEval = new Map<string, number>();
  for (const g of allGrades ?? []) {
    if (g.score === null) continue;
    gradedCountByEval.set(g.evaluation_id, (gradedCountByEval.get(g.evaluation_id) ?? 0) + 1);
  }
  const studentCountByCourse = new Map<string, number>();
  for (const e of enrollments ?? []) {
    studentCountByCourse.set(e.course_id, (studentCountByCourse.get(e.course_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    evalType: r.eval_type,
    weight: r.weight,
    evalDate: r.eval_date,
    description: r.description,
    status: r.status,
    gradedCount: gradedCountByEval.get(r.id) ?? 0,
    studentCount: studentCountByCourse.get(r.course_id) ?? 0,
    courseId: r.course_id,
    subjectId: r.subject_id,
    periodId: r.period_id,
    courseLabel: r.courses ? `${r.courses.level} ${r.courses.letter}`.trim() : "—",
    subjectName: r.subjects?.name ?? "—",
    periodName: r.academic_periods?.name ?? null,
  }));
}
