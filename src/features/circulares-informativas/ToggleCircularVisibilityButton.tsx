"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleCircularVisibilityButton({ id, title, visible }: { id: string; title: string; visible: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const nextVisible = !visible;
    const confirmMsg = nextVisible
      ? `¿Mostrar "${title}" en la página pública?`
      : `¿Ocultar "${title}" de la página pública? El archivo se conserva.`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("circulares_informativas").update({ visible: nextVisible }).eq("id", id);
    if (error) {
      setLoading(false);
      window.alert("No pudimos actualizar la circular.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: nextVisible ? "mostrar_circular_informativa" : "ocultar_circular_informativa",
      p_module: "circulares_informativas",
      p_entity: "circulares_informativas",
      p_entity_id: id,
      p_details: { title },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
    >
      {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {visible ? "Ocultar" : "Mostrar"}
    </button>
  );
}
