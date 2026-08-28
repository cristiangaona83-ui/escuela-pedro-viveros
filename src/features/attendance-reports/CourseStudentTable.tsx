"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { formatDate, formatRun } from "@/lib/utils";
import { SemaforoBadge } from "@/features/attendance-reports/SemaforoBadge";
import type { CourseStudentRow } from "@/services/attendance-analytics";

type SortKey = "nombre" | "menor" | "mayor" | "ausencias";

/** RUN completo solo se muestra si `canSeeRun` (permiso ya resuelto por el server component según el rol) -- ver punto 9 del pedido, "no ampliar exposición de datos personales". */
export function CourseStudentTable({ courseId, students, canSeeRun }: { courseId: string; students: CourseStudentRow[]; canSeeRun: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("nombre");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = students;
    if (q) {
      list = list.filter((s) => s.fullName.toLowerCase().includes(q) || (canSeeRun && s.run.toLowerCase().includes(q)));
    }
    const sorted = [...list];
    switch (sort) {
      case "menor":
        sorted.sort((a, b) => (a.rate ?? -1) - (b.rate ?? -1));
        break;
      case "mayor":
        sorted.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
        break;
      case "ausencias":
        sorted.sort((a, b) => b.counts.ausente - a.counts.ausente);
        break;
      default:
        sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    return sorted;
  }, [students, query, sort, canSeeRun]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar estudiante…" className="pl-9" />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500">Ordenar:</span>
          {([
            ["nombre", "Nombre"],
            ["menor", "Menor asistencia"],
            ["mayor", "Mayor asistencia"],
            ["ausencias", "Más ausencias"],
          ] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`rounded-full px-2.5 py-1 font-medium ${sort === key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3">Estudiante</th>
              {canSeeRun && <th className="py-2 pr-3">RUN</th>}
              <th className="py-2 pr-3 text-center">%</th>
              <th className="py-2 pr-3 text-center">Pres.</th>
              <th className="py-2 pr-3 text-center">Aus.</th>
              <th className="py-2 pr-3 text-center">Atr.</th>
              <th className="py-2 pr-3 text-center">Ret.</th>
              <th className="py-2 pr-3">Última ausencia</th>
              <th className="py-2 pr-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.studentId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2 pr-3">
                  <Link href={`/plataforma/asistencia/reportes/${courseId}/${s.studentId}`} className="font-medium text-brand-700 hover:underline">
                    {s.fullName}
                  </Link>
                </td>
                {canSeeRun && <td className="py-2 pr-3 text-slate-600">{formatRun(s.run)}</td>}
                <td className="py-2 pr-3 text-center font-medium text-slate-800">{s.rate !== null ? `${s.rate}%` : "—"}</td>
                <td className="py-2 pr-3 text-center text-slate-600">{s.counts.presente}</td>
                <td className="py-2 pr-3 text-center text-slate-600">{s.counts.ausente}</td>
                <td className="py-2 pr-3 text-center text-slate-600">{s.counts.atraso}</td>
                <td className="py-2 pr-3 text-center text-slate-600">{s.counts.retiro}</td>
                <td className="py-2 pr-3 text-slate-600">{s.lastAbsence ? formatDate(s.lastAbsence) : "—"}</td>
                <td className="py-2 pr-3">
                  <SemaforoBadge level={s.semaforo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Sin estudiantes que coincidan con la búsqueda.</p>}
      </div>
    </div>
  );
}
