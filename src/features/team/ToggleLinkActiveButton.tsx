"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleLinkActiveButton({
  table,
  id,
  active,
  label,
  auditModule,
}: {
  table: "staff_section_memberships" | "subject_teachers";
  id: string;
  active: boolean;
  label: string;
  auditModule: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = active ? "ocultar" : "mostrar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${label}" en el sitio público?`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from(table).update({ active: !active }).eq("id", id);

    if (error) {
      setLoading(false);
      window.alert(`No pudimos ${action}.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: active ? "ocultar_equipo" : "mostrar_equipo",
      p_module: auditModule,
      p_entity: table,
      p_entity_id: id,
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
      {active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {active ? "Ocultar" : "Mostrar"}
    </button>
  );
}
