"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, History as HistoryIcon } from "lucide-react";
import { Select, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatGrade } from "@/lib/utils";
import { GRADE_CHANGE_REASON_LABEL } from "@/services/grade-admin";
import type { GradeHistoryEntry } from "@/services/grade-history";

const ACTION_LABEL: Record<GradeHistoryEntry["action"], string> = {
  creada: "Creada",
  modificada: "Modificada",
  eliminada: "Eliminada",
  restaurada: "Restaurada",
};
const ACTION_TONE: Record<GradeHistoryEntry["action"], "success" | "brand" | "danger" | "neutral"> = {
  creada: "success",
  modificada: "brand",
  eliminada: "danger",
  restaurada: "neutral",
};

function scoreLabel(score: number | null): string {
  return score === null ? "—" : formatGrade(score);
}

export function GradeHistoryTable({
  entries,
  courses,
  subjects,
  selectedCourseId,
  selectedSubjectId,
  dateFrom,
  dateTo,
}: {
  entries: GradeHistoryEntry[];
  courses: { id: string; level: string; letter: string }[];
  subjects: { id: string; name: string }[];
  selectedCourseId: string;
  selectedSubjectId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) =>
        e.studentName?.toLowerCase().includes(term) ||
        e.changedByName?.toLowerCase().includes(term) ||
        e.evaluationName?.toLowerCase().includes(term)
    );
  }, [entries, search]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-slate-500">Curso</label>
          <Select value={selectedCourseId} onChange={(e) => updateParam("course", e.target.value)}>
            <option value="">Todos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{`${c.level} ${c.letter}`.trim()}</option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-slate-500">Asignatura</label>
          <Select value={selectedSubjectId} onChange={(e) => updateParam("subject", e.target.value)}>
            <option value="">Todas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-500">Desde</label>
          <Input type="date" value={dateFrom} onChange={(e) => updateParam("from", e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-500">Hasta</label>
          <Input type="date" value={dateTo} onChange={(e) => updateParam("to", e.target.value)} />
        </div>
        <div className="relative w-64">
          <label className="mb-1 block text-xs font-medium text-slate-500">Buscar (estudiante, usuario, evaluación)</label>
          <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        {filtered.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="Sin movimientos" description="No hay cambios registrados con estos filtros." />
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pl-3 pr-3">Fecha</th>
                <th className="py-2 pr-3">Estudiante</th>
                <th className="py-2 pr-3">Curso / Asignatura</th>
                <th className="py-2 pr-3">Evaluación</th>
                <th className="py-2 pr-3 text-center">Nota anterior</th>
                <th className="py-2 pr-3 text-center">Nota nueva</th>
                <th className="py-2 pr-3">Acción</th>
                <th className="py-2 pr-3">Motivo</th>
                <th className="py-2 pr-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pl-3 pr-3 whitespace-nowrap text-slate-600">{formatDate(e.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" })} <span className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span></td>
                  <td className="py-2 pr-3 text-slate-800">{e.studentName ?? "—"}{e.studentRun && <span className="block text-xs text-slate-400">{e.studentRun}</span>}</td>
                  <td className="py-2 pr-3 text-slate-600">{e.courseLabel ?? "—"}{e.subjectName && <span className="block text-xs text-slate-400">{e.subjectName}</span>}</td>
                  <td className="py-2 pr-3 text-slate-600">{e.evaluationName ?? "—"}</td>
                  <td className="py-2 pr-3 text-center text-slate-500">{scoreLabel(e.previousScore)}</td>
                  <td className="py-2 pr-3 text-center font-semibold text-slate-900">{scoreLabel(e.newScore)}</td>
                  <td className="py-2 pr-3"><Badge tone={ACTION_TONE[e.action]}>{ACTION_LABEL[e.action]}</Badge></td>
                  <td className="py-2 pr-3 text-slate-600">
                    {e.reason ? GRADE_CHANGE_REASON_LABEL[e.reason] : "—"}
                    {e.reasonNote && <span className="block text-xs text-slate-400">{e.reasonNote}</span>}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{e.changedByName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
