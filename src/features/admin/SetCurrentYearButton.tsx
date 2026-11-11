"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Marca un año como el vigente (el que se abre por defecto). Solo Dirección/Superadmin (la función SQL lo exige). */
export function SetCurrentYearButton({ yearId, year }: { yearId: string; year: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(`¿Marcar ${year} como el año vigente? Será el año que se abre por defecto al entrar a la plataforma.`)) return;
    setLoading(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("set_current_academic_year", { p_year_id: yearId });
    setLoading(false);
    if (rpcError) {
      setError("No se pudo cambiar el año vigente.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <Star className="h-3.5 w-3.5" /> {loading ? "Guardando…" : "Marcar como vigente"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
