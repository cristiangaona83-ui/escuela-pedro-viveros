"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatGrade } from "@/lib/utils";
import type { SubjectGradeMatrix } from "@/services/grade-overview";

const STATUS_LABEL: Record<SubjectGradeMatrix["students"][number]["status"], string> = {
  completo: "Completo",
  pendiente: "Pendiente",
  sin_notas: "Sin notas",
};
const STATUS_TONE: Record<SubjectGradeMatrix["students"][number]["status"], "success" | "warning" | "danger"> = {
  completo: "success",
  pendiente: "warning",
  sin_notas: "danger",
};

export function SubjectGradeMatrixTable({ matrix }: { matrix: SubjectGradeMatrix }) {
  const [showAll, setShowAll] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return matrix.students
      .filter((s) => (showAll ? true : s.status !== "completo"))
      .filter((s) => (term ? s.studentName.toLowerCase().includes(term) : true));
  }, [matrix.students, showAll, search]);

  if (matrix.evaluations.length === 0) {
    return <EmptyState icon={Users} title="Sin evaluaciones registradas" description="Esta asignatura no tiene evaluaciones creadas para el período seleccionado." />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${showAll ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Ver todos
          </button>
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${!showAll ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Ver pendientes
          </button>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estudiante…" className="pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="sticky left-0 z-10 bg-slate-50 py-2 pl-3 pr-3">Estudiante</th>
              {matrix.evaluations.map((ev) => (
                <th key={ev.id} className="whitespace-nowrap px-3 py-2 text-center">{ev.name}</th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-center">Promedio</th>
              <th className="whitespace-nowrap px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={matrix.evaluations.length + 3} className="py-8 text-center text-sm text-slate-400">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.studentId} className="border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-10 bg-white py-2 pl-3 pr-3 font-medium text-slate-800">
                    {s.studentName}
                    {s.missingEvaluationNames.length > 0 && (
                      <p className="mt-0.5 text-[11px] font-normal text-amber-700">Falta: {s.missingEvaluationNames.join(", ")}</p>
                    )}
                  </td>
                  {matrix.evaluations.map((ev) => {
                    const score = s.scores[ev.id];
                    return (
                      <td key={ev.id} className={`px-3 py-2 text-center ${score === null ? "bg-amber-50 text-amber-500" : "text-slate-700"}`}>
                        {score === null ? "—" : formatGrade(score)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-semibold text-slate-900">{formatGrade(s.average)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
