"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Lock, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatGrade } from "@/lib/utils";
import { isGradeInRange, roundGrade, type GradingConfig } from "@/config/grading";
import type { CourseSubjectOption } from "@/services/academic-scope";
import type { AcademicPeriodRow } from "@/types/database";

interface EvaluationLite {
  id: string;
  name: string;
  weight: number;
  status: string;
}
interface StudentLite {
  id: string;
  first_names: string;
  last_names: string;
}
type GradeMap = Record<string, Record<string, { id?: string; score: number | null }>>; // studentId -> evaluationId -> grade

export function GradeEntryGrid({
  options,
  periods,
  gradingConfig,
  userId,
}: {
  options: CourseSubjectOption[];
  periods: (AcademicPeriodRow & { academic_years: { year: number } | null })[];
  gradingConfig: GradingConfig;
  userId: string;
}) {
  const [scopeKey, setScopeKey] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [evaluations, setEvaluations] = useState<EvaluationLite[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [grades, setGrades] = useState<GradeMap>({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newEvalName, setNewEvalName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedOption = options.find((o) => `${o.course_id}::${o.subject_id}` === scopeKey);
  const selectedPeriod = periods.find((p) => p.id === periodId);
  const periodClosed = selectedPeriod?.status === "cerrado";

  const loadData = useCallback(async () => {
    if (!selectedOption || !periodId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [{ data: evals }, { data: enrollments }] = await Promise.all([
      supabase
        .from("evaluations")
        .select("id, name, weight, status")
        .eq("course_id", selectedOption.course_id)
        .eq("subject_id", selectedOption.subject_id)
        .eq("period_id", periodId)
        .order("eval_date", { ascending: true }),
      supabase
        .from("enrollments")
        .select("students(id, first_names, last_names)")
        .eq("course_id", selectedOption.course_id)
        .eq("status", "activa"),
    ]);

    const evalList = evals ?? [];
    setEvaluations(evalList);

    const studentList = (enrollments ?? [])
      .map((e) => (e as unknown as { students: StudentLite | null }).students)
      .filter((s): s is StudentLite => Boolean(s))
      .sort((a, b) => a.last_names.localeCompare(b.last_names));
    setStudents(studentList);

    if (evalList.length > 0) {
      const { data: gradeRows } = await supabase
        .from("grades")
        .select("id, evaluation_id, student_id, score")
        .in("evaluation_id", evalList.map((e) => e.id));

      const map: GradeMap = {};
      for (const s of studentList) map[s.id] = {};
      for (const g of gradeRows ?? []) {
        if (!map[g.student_id]) map[g.student_id] = {};
        map[g.student_id][g.evaluation_id] = { id: g.id, score: g.score };
      }
      setGrades(map);
    } else {
      setGrades({});
    }

    setLoading(false);
  }, [selectedOption, periodId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al cambiar de curso/período
    loadData();
  }, [loadData]);

  async function handleCreateEvaluation() {
    if (!selectedOption || !periodId || !newEvalName.trim()) return;
    const supabase = createClient();
    const { error: dbError } = await supabase.from("evaluations").insert({
      course_id: selectedOption.course_id,
      subject_id: selectedOption.subject_id,
      period_id: periodId,
      teacher_id: userId,
      name: newEvalName.trim(),
      eval_type: "sumativa",
      weight: 1,
      status: "aplicada",
    });
    if (dbError) {
      setError("No pudimos crear la evaluación.");
      return;
    }
    setNewEvalName("");
    loadData();
  }

  async function handleScoreChange(studentId: string, evaluationId: string, rawValue: string) {
    setError(null);
    const value = rawValue.trim();
    const numeric = value === "" ? null : Number(value.replace(",", "."));

    if (numeric !== null && (Number.isNaN(numeric) || !isGradeInRange(numeric, gradingConfig))) {
      setError(`La nota debe estar entre ${gradingConfig.scaleMin} y ${gradingConfig.scaleMax}.`);
      return;
    }

    const finalScore = numeric === null ? null : roundGrade(numeric, gradingConfig);
    const key = `${studentId}:${evaluationId}`;
    setSavingKey(key);

    setGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [evaluationId]: { ...prev[studentId]?.[evaluationId], score: finalScore } },
    }));

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const { error: dbError } = await supabase
      .from("grades")
      .upsert(
        {
          evaluation_id: evaluationId,
          student_id: studentId,
          score: finalScore,
          entered_by: authData.user?.id ?? null,
          updated_by: authData.user?.id ?? null,
        },
        { onConflict: "evaluation_id,student_id" }
      );

    setSavingKey(null);
    if (dbError) setError("No se pudo guardar la nota. El período podría estar cerrado.");
  }

  const averages = useMemo(() => {
    const result: Record<string, number | null> = {};
    for (const s of students) {
      const studentGrades = grades[s.id] ?? {};
      let weightedSum = 0;
      let totalWeight = 0;
      for (const ev of evaluations) {
        const score = studentGrades[ev.id]?.score;
        if (score !== null && score !== undefined) {
          weightedSum += score * (ev.weight || 1);
          totalWeight += ev.weight || 1;
        }
      }
      result[s.id] = totalWeight > 0 ? roundGrade(weightedSum / totalWeight, gradingConfig) : null;
    }
    return result;
  }, [students, evaluations, grades, gradingConfig]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Curso y asignatura</label>
          <Select value={scopeKey} onChange={(e) => setScopeKey(e.target.value)}>
            <option value="">Selecciona…</option>
            {options.map((o) => (
              <option key={`${o.course_id}::${o.subject_id}`} value={`${o.course_id}::${o.subject_id}`}>
                {o.course_label} — {o.subject_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Período</label>
          <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">Selecciona…</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.academic_years?.year} · {p.name} {p.status === "cerrado" ? "(cerrado)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Input
            placeholder="Nombre nueva evaluación"
            value={newEvalName}
            onChange={(e) => setNewEvalName(e.target.value)}
            disabled={!scopeKey || !periodId || periodClosed}
          />
          <Button type="button" size="md" onClick={handleCreateEvaluation} disabled={!scopeKey || !periodId || periodClosed || !newEvalName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {periodClosed && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" /> Este período está cerrado: las calificaciones no se pueden modificar.
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-6">
        {!scopeKey || !periodId ? (
          <p className="text-sm text-slate-500">Selecciona un curso, asignatura y período para ver el libro de notas.</p>
        ) : loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : students.length === 0 ? (
          <EmptyState icon={AlertCircle} title="Sin estudiantes matriculados" description="Este curso todavía no tiene matrículas activas." />
        ) : evaluations.length === 0 ? (
          <EmptyState icon={Plus} title="Sin evaluaciones en este período" description="Crea la primera evaluación con el formulario de arriba." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3">Estudiante</th>
                  {evaluations.map((ev) => (
                    <th key={ev.id} className="px-3 py-3 text-center">{ev.name}</th>
                  ))}
                  <th className="px-3 py-3 text-center">Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                      {s.last_names}, {s.first_names}
                    </td>
                    {evaluations.map((ev) => {
                      const key = `${s.id}:${ev.id}`;
                      const score = grades[s.id]?.[ev.id]?.score;
                      return (
                        <td key={ev.id} className="px-3 py-2 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={score !== null && score !== undefined ? formatGrade(score) : ""}
                            onBlur={(e) => handleScoreChange(s.id, ev.id, e.target.value)}
                            disabled={periodClosed}
                            className="h-9 w-16 rounded-lg border border-slate-300 text-center text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50"
                          />
                          {savingKey === key && <span className="ml-1 text-[10px] text-slate-400">…</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {averages[s.id] !== null ? (
                        <Badge tone={averages[s.id]! >= gradingConfig.approvalMinimum ? "success" : "danger"}>
                          {formatGrade(averages[s.id])}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && evaluations.length > 0 && students.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Las notas se guardan automáticamente al salir del campo.
        </p>
      )}
    </div>
  );
}
