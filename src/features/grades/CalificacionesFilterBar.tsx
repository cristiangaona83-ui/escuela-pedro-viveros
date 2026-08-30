"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Field";
import type { AcademicPeriodRow, AcademicYearRow } from "@/types/database";

/** Filtro de año/período del resumen institucional de Calificaciones, controlado por la URL -- mismo mecanismo que InformesFilterBar, sin inventar un estado paralelo. */
export function CalificacionesFilterBar({
  academicYears,
  periods,
  year,
  period,
}: {
  academicYears: AcademicYearRow[];
  periods: (AcademicPeriodRow & { academic_years: { year: number } | null })[];
  year: string;
  period: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "year") params.delete("period");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">Año académico</label>
        <Select value={year} onChange={(e) => updateParam("year", e.target.value)}>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </Select>
      </div>
      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-slate-500">Período</label>
        <Select value={period} onChange={(e) => updateParam("period", e.target.value)} disabled={periods.length === 0}>
          <option value="">Todo el año</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
