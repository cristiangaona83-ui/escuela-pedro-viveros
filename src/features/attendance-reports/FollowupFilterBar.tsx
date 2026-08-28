"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, Input } from "@/components/ui/Field";

/** Filtros de la lista de seguimiento, controlados por la URL igual que PeriodFilterBar -- así el CSV exportado siempre coincide exactamente con lo que se ve en pantalla. */
export function FollowupFilterBar({ maxRate, minConsecutive, mondayFriday }: { maxRate: string; minConsecutive: string; mondayFriday: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-500">Umbral</label>
        <Select value={maxRate} onChange={(e) => updateParam("maxRate", e.target.value)}>
          <option value="">Umbral configurado</option>
          <option value="90">Bajo 90%</option>
          <option value="85">Bajo 85%</option>
          <option value="80">Bajo 80%</option>
        </Select>
      </div>
      <div className="w-52">
        <label className="mb-1 block text-xs font-medium text-slate-500">Días consecutivos ausente (mín.)</label>
        <Input type="number" min={0} value={minConsecutive} onChange={(e) => updateParam("minConsecutive", e.target.value)} placeholder="Sin filtro" />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={mondayFriday}
          onChange={(e) => updateParam("mondayFriday", e.target.checked ? "1" : "")}
          className="h-4 w-4 rounded border-slate-300"
        />
        Reiteración lunes/viernes
      </label>
    </div>
  );
}
