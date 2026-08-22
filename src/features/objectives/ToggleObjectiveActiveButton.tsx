"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleObjectiveActiveButton({
  objectiveId,
  active,
  code,
}: {
  objectiveId: string;
  active: boolean;
  code: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = active ? "desactivar" : "reactivar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el objetivo ${code}?`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("learning_objectives").update({ active: !active }).eq("id", objectiveId);

    if (error) {
      setLoading(false);
      window.alert(`No pudimos ${action} el objetivo.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: active ? "desactivar_objetivo_aprendizaje" : "activar_objetivo_aprendizaje",
      p_module: "objetivos",
      p_entity: "learning_objectives",
      p_entity_id: objectiveId,
      p_details: { code },
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
      {active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {active ? "Desactivar" : "Reactivar"}
    </button>
  );
}
