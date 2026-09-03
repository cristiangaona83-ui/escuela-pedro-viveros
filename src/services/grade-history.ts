import { createClient } from "@/lib/supabase/server";
import type { GradeChangeReason } from "@/types/database";

export interface GradeHistoryEntry {
  id: string;
  studentName: string | null;
  studentRun: string | null;
  evaluationName: string | null;
  courseLabel: string | null;
  subjectName: string | null;
  previousScore: number | null;
  newScore: number | null;
  action: "creada" | "modificada" | "eliminada" | "restaurada";
  reason: GradeChangeReason | null;
  reasonNote: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface GradeHistoryFilters {
  courseId?: string;
  subjectId?: string;
  evaluationId?: string;
  studentId?: string;
  changedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** "Ver historial de modificaciones" -- una fila por cambio, con nombres resueltos (no ids) para que la tabla sea legible directamente. */
export async function getGradeChangeHistory(filters: GradeHistoryFilters, limit = 200): Promise<GradeHistoryEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("grade_change_history")
    .select(
      "id, previous_score, new_score, action, reason, reason_note, created_at, evaluation_name, course_id, subject_id, courses(level, letter), subjects(name), students(first_names, last_names, run), profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.courseId) query = query.eq("course_id", filters.courseId);
  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.evaluationId) query = query.eq("evaluation_id", filters.evaluationId);
  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.changedBy) query = query.eq("changed_by", filters.changedBy);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  const { data } = await query;

  type Row = {
    id: string;
    previous_score: number | null;
    new_score: number | null;
    action: GradeHistoryEntry["action"];
    reason: GradeChangeReason | null;
    reason_note: string | null;
    created_at: string;
    evaluation_name: string | null;
    courses: { level: string; letter: string } | null;
    subjects: { name: string } | null;
    students: { first_names: string; last_names: string; run: string } | null;
    profiles: { full_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    studentName: r.students ? `${r.students.first_names} ${r.students.last_names}` : null,
    studentRun: r.students?.run ?? null,
    evaluationName: r.evaluation_name,
    courseLabel: r.courses ? `${r.courses.level} ${r.courses.letter}`.trim() : null,
    subjectName: r.subjects?.name ?? null,
    previousScore: r.previous_score,
    newScore: r.new_score,
    action: r.action,
    reason: r.reason,
    reasonNote: r.reason_note,
    changedByName: r.profiles?.full_name ?? null,
    createdAt: r.created_at,
  }));
}
