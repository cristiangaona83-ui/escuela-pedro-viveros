"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, Input } from "@/components/ui/Field";
import type { PeriodKey } from "@/lib/attendance/periods";

const OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana actual" },
  { value: "mes", label: "Mes" },
  { value: "semestre", label: "Semestre" },
  { value: "anio", label: "Año completo" },
  { value: "personalizado", label: "Rango personalizado" },
];

/** Filtro de período controlado por la URL (?period=&from=&to=) -- la página server component vuelve a calcular todo al navegar, sin estado de cliente que se pueda desincronizar de lo que se exporta a PDF/CSV. */
export function PeriodFilterBar({ period, from, to }: { period: PeriodKey; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <label className="mb-1 block text-xs font-medium text-slate-500">Período</label>
        <Select value={period} onChange={(e) => updateParam("period", e.target.value)}>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      {period === "personalizado" && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Desde</label>
            <Input type="date" value={from} onChange={(e) => updateParam("from", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Hasta</label>
            <Input type="date" value={to} onChange={(e) => updateParam("to", e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
}
