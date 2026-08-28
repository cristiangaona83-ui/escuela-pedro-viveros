"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Anulación lógica (status='anulada') -- nunca DELETE físico. Recalcula automáticamente los % de asistencia la próxima vez que se pida un reporte, sin tocar filas de attendance. */
export function VoidSuspensionButton({ suspensionId, label }: { suspensionId: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    if (!window.confirm(`¿Anular "${label}"? Dejará de excluir/incluir fechas del cálculo de asistencia, pero el registro se conserva.`)) return;
    const reason = window.prompt("Motivo de la anulación (opcional):") ?? "";

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      window.alert("Sesión no válida.");
      return;
    }

    const { error } = await supabase
      .from("class_suspensions")
      .update({ status: "anulada", voided_by: user.id, voided_at: new Date().toISOString(), void_reason: reason || null })
      .eq("id", suspensionId);
    if (error) {
      setLoading(false);
      window.alert("No pudimos anular el registro.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "anular_suspension_clases",
      p_module: "asistencia",
      p_entity: "class_suspensions",
      p_entity_id: suspensionId,
      p_details: { void_reason: reason || null },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleVoid}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      <Ban className="h-3.5 w-3.5" /> {loading ? "Anulando…" : "Anular"}
    </button>
  );
}
