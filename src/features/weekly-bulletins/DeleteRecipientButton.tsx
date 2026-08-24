"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteRecipientButton({ recipientId, fullName }: { recipientId: string; fullName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar definitivamente a "${fullName}" de la lista de destinatarios? Esta acción no se puede deshacer.`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("bulletin_recipients").delete().eq("id", recipientId);

    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar al destinatario.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "eliminar_destinatario_informativo",
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
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> Eliminar
    </button>
  );
}
