"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleProtocolActiveButton({ id, active, name }: { id: string; active: boolean; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("convivencia_protocols").update({ active: !active }).eq("id", id);
    if (error) {
      setLoading(false);
      window.alert("No pudimos actualizar el protocolo.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: active ? "desactivar_protocolo" : "activar_protocolo_catalogo",
      p_module: "convivencia",
      p_entity: "convivencia_protocols",
      p_entity_id: id,
      p_details: { name },
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={
        active
          ? "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          : "inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      }
    >
      {active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
