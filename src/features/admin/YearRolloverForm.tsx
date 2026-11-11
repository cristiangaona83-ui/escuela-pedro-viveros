"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import type { RolloverDecision, RolloverPlan } from "@/services/year-rollover";

const DECISION_LABEL: Record<RolloverDecision, string> = {
  promover: "Promueve",
  repetir: "Repite",
  no_continua: "No continúa",
};

interface Summary {
  from_year: number;
  to_year: number;
  courses_created: number;
  assignments_copied: number;
  enrolled: number;
  skipped: number;
  graduated: number;
}

/**
 * Traspaso de un año al siguiente. El plan (qué curso pasa a cuál) viene
 * calculado del servidor; acá se ajusta qué pasa con cada estudiante
 * (promueve / repite / no continúa) y se eligen las opciones. Al ejecutar, el
 * servidor vuelve a calcular el plan y lo aplica en una sola transacción.
 */
export function YearRolloverForm({
  years,
  fromId,
  toId,
  plan,
}: {
  years: { id: string; year: number }[];
  fromId: string;
  toId: string;
  plan: RolloverPlan | null;
}) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, RolloverDecision>>({});
  const [copyHomeroom, setCopyHomeroom] = useState(true);
  const [copyAssignments, setCopyAssignments] = useState(true);
  const [graduate, setGraduate] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const fromYear = years.find((y) => y.id === fromId);
  const toYear = years.find((y) => y.id === toId);

  function decisionOf(studentId: string, fallback: RolloverDecision): RolloverDecision {
    return decisions[studentId] ?? fallback;
  }

  function setDecision(studentId: string, value: RolloverDecision) {
    setDecisions((prev) => ({ ...prev, [studentId]: value }));
  }

  function setCourseDecision(courseId: string, value: RolloverDecision) {
    const course = plan?.courses.find((c) => c.courseId === courseId);
    if (!course) return;
    setDecisions((prev) => {
      const next = { ...prev };
      for (const s of course.students) if (!s.alreadyEnrolled) next[s.studentId] = value;
      return next;
    });
  }

  const totals = useMemo(() => {
    const t = { promover: 0, repetir: 0, no_continua: 0, egresan: 0, ya: 0 };
    for (const c of plan?.courses ?? []) {
      for (const s of c.students) {
        if (s.alreadyEnrolled) {
          t.ya += 1;
          continue;
        }
        const d = decisions[s.studentId] ?? s.defaultDecision;
        t[d] += 1;
        if (d === "promover" && c.kind === "egresa") t.egresan += 1;
      }
    }
    return t;
  }, [plan, decisions]);

  function navigate(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    router.push(`/plataforma/administracion/traspaso?${params.toString()}`);
  }

  async function handleRun() {
    if (!plan || !fromYear || !toYear) return;
    const message =
      `¿Traspasar del ${fromYear.year} al ${toYear.year}?\n\n` +
      `• ${totals.promover - totals.egresan} estudiantes pasan al curso siguiente\n` +
      (totals.egresan > 0 ? `• ${totals.egresan} egresan${graduate ? " (se marcan como egresados)" : ""}\n` : "") +
      `• ${totals.repetir} repiten\n• ${totals.no_continua} no continúan\n` +
      (totals.ya > 0 ? `• ${totals.ya} ya están matriculados en ${toYear.year} y se omiten\n` : "") +
      `\nEl año ${fromYear.year} no se modifica.`;
    if (!window.confirm(message)) return;

    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/plataforma/api/traspaso-anio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromYearId: fromId, toYearId: toId, decisions, copyHomeroom, copyAssignments, graduate }),
      });
      const json = (await res.json().catch(() => ({}))) as { summary?: Summary; error?: string };
      if (!res.ok || !json.summary) {
        setError(json.error ?? "No se pudo realizar el traspaso.");
        return;
      }
      setSummary(json.summary);
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  async function goToTargetYear() {
    await fetch("/plataforma/api/anio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yearId: toId }),
    });
    router.push("/plataforma/cursos");
    router.refresh();
  }

  if (summary) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Traspaso {summary.from_year} → {summary.to_year} realizado</h2>
          </div>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>{summary.enrolled} estudiantes matriculados en el {summary.to_year}</li>
            <li>{summary.courses_created} cursos creados</li>
            <li>{summary.assignments_copied} asignaciones de carga docente copiadas</li>
            {summary.graduated > 0 && <li>{summary.graduated} estudiantes marcados como egresados</li>}
            {summary.skipped > 0 && <li>{summary.skipped} ya estaban matriculados y se omitieron</li>}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="sm" onClick={goToTargetYear}>
              Ir al año {summary.to_year} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSummary(null)}>
              Volver al traspaso
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Para que el {summary.to_year} sea el año que se abre por defecto, márquelo como vigente en Administración → Años académicos.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">Año de origen</label>
              <Select value={fromId} onChange={(e) => navigate(e.target.value, toId === e.target.value ? "" : toId)}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.year}</option>
                ))}
              </Select>
            </div>
            <ArrowRight className="mb-2.5 h-4 w-4 text-slate-400" />
            <div className="w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">Año de destino</label>
              <Select value={toId} onChange={(e) => navigate(fromId, e.target.value)}>
                {years.filter((y) => y.id !== fromId).map((y) => (
                  <option key={y.id} value={y.id}>{y.year}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={copyHomeroom} onChange={(e) => setCopyHomeroom(e.target.checked)} />
              <span>Copiar profesor(a) jefe de cada curso</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={copyAssignments} onChange={(e) => setCopyAssignments(e.target.checked)} />
              <span>Copiar carga docente (asignaturas y docentes)</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={graduate} onChange={(e) => setGraduate(e.target.checked)} />
              <span>Marcar como egresados a quienes terminan 8° Básico</span>
            </label>
          </div>

          {plan && (plan.targetCourseCount > 0 || plan.targetEnrollmentCount > 0) && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              El {toYear?.year} ya tiene {plan.targetCourseCount} curso(s) y {plan.targetEnrollmentCount} matrícula(s). Se reutilizan los cursos existentes y quienes ya están matriculados se omiten.
            </div>
          )}
        </CardBody>
      </Card>

      {!plan || plan.courses.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-slate-500">El año de origen no tiene cursos activos para traspasar.</CardBody>
        </Card>
      ) : (
        plan.courses.map((course) => (
          <Card key={course.courseId}>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{course.label}</h3>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  {course.kind === "promueve" && <Badge tone="brand">{course.destLabel}</Badge>}
                  {course.kind === "egresa" && (
                    <Badge tone="neutral"><GraduationCap className="mr-1 inline h-3.5 w-3.5" />Egresan</Badge>
                  )}
                  {course.kind === "sin_siguiente" && <Badge tone="warning">Nivel sin curso siguiente definido</Badge>}
                  <span className="text-xs text-slate-500">{course.students.length} estudiante{course.students.length === 1 ? "" : "s"}</span>
                </div>
                {course.students.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(["promover", "repetir", "no_continua"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCourseDecision(course.courseId, d)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
                      >
                        Todos: {DECISION_LABEL[d].toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {course.students.length === 0 ? (
                <p className="text-xs text-slate-400">Sin estudiantes con matrícula activa.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <tbody>
                      {course.students.map((s) => (
                        <tr key={s.studentId} className="border-t border-slate-100">
                          <td className="py-1.5 pr-3 text-slate-800">{s.name}</td>
                          <td className="py-1.5 pr-3 text-xs text-slate-400">{s.run}</td>
                          <td className="py-1.5 text-right">
                            {s.alreadyEnrolled ? (
                              <Badge tone="neutral">Ya matriculado en {toYear?.year}</Badge>
                            ) : (
                              <select
                                value={decisionOf(s.studentId, s.defaultDecision)}
                                onChange={(e) => setDecision(s.studentId, e.target.value as RolloverDecision)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                                aria-label={`Decisión para ${s.name}`}
                              >
                                {(Object.keys(DECISION_LABEL) as RolloverDecision[]).map((d) => (
                                  <option key={d} value={d}>{DECISION_LABEL[d]}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        ))
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            <strong>{totals.promover - totals.egresan}</strong> pasan de curso · <strong>{totals.egresan}</strong> egresan · <strong>{totals.repetir}</strong> repiten ·{" "}
            <strong>{totals.no_continua}</strong> no continúan{totals.ya > 0 && <> · {totals.ya} ya matriculados</>}
          </p>
          <div className="flex items-center gap-3">
            {error && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </span>
            )}
            <Button type="button" size="sm" onClick={handleRun} disabled={running || !plan || plan.courses.length === 0 || !fromId || !toId}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {running ? "Traspasando…" : `Traspasar al ${toYear?.year ?? "año siguiente"}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
