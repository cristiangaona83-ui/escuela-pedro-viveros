"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleRecipientActiveButton({ recipientId, active, fullName }: { recipientId: string; active: boolean; fullName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = active ? "desactivar" : "activar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${fullName}"? ${active ? "No recibirá los próximos envíos." : "Volverá a recibir los próximos envíos."}`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("bulletin_recipients").update({ active: !active }).eq("id", recipientId);

    if (error) {
      setLoading(false);
      window.alert(`No pudimos ${action} al destinatario.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: active ? "desactivar_destinatario_informativo" : "activar_destinatario_informativo",
      p_module: "informativos",
      p_entity: "bulletin_recipients",
      p_entity_id: recipientId,
      p_details: { full_name: fullName },
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
