"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleAssignmentActiveButton({
  assignmentId,
  active,
  label,
}: {
  assignmentId: string;
  active: boolean;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = active ? "quitar" : "reactivar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la asignación "${label}"?`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("teacher_assignments").update({ active: !active }).eq("id", assignmentId);

    if (error) {
      setLoading(false);
      window.alert(`No pudimos ${action} la asignación.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: active ? "quitar_asignacion_docente" : "reactivar_asignacion_docente",
      p_module: "carga_docente",
      p_entity: "teacher_assignments",
      p_entity_id: assignmentId,
      p_details: { label },
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
      {active ? "Quitar" : "Reactivar"}
    </button>
  );
}
