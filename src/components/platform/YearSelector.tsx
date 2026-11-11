"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface YearOption {
  id: string;
  year: number;
  /** Año vigente (el que se abre por defecto). */
  current: boolean;
}

/**
 * Selector del año de trabajo de la plataforma (barra superior). Al cambiarlo
 * se guarda en una cookie y se recarga la página: cursos, estudiantes,
 * evaluaciones, informes, etc. pasan a mostrar ese año. También se quitan los
 * filtros `year`/`period` de la URL, que si no mantendrían el año anterior.
 */
export function YearSelector({ years, selectedId }: { years: YearOption[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  const selected = years.find((y) => y.id === selectedId);
  const notCurrent = selected && !selected.current;

  async function handleChange(yearId: string) {
    if (yearId === selectedId) return;
    setBusy(true);
    try {
      const res = await fetch("/plataforma/api/anio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearId }),
      });
      if (!res.ok) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("year");
      params.delete("period");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (years.length === 0) return null;

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm",
        notCurrent ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"
      )}
      title={notCurrent ? "Estás viendo un año que no es el vigente" : "Año de trabajo de la plataforma"}
    >
      <CalendarRange className="h-4 w-4 shrink-0" />
      <span className="hidden text-xs font-medium sm:inline">Año</span>
      <select
        value={selectedId}
        disabled={busy}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-sm font-semibold focus:outline-none disabled:opacity-60"
        aria-label="Año académico de trabajo"
      >
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.year}
            {y.current ? " (vigente)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
