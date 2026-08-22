"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleActiveButton({
  profileId,
  active,
  fullName,
  isSelf,
}: {
  profileId: string;
  active: boolean;
  fullName: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = active ? "desactivar" : "activar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la cuenta de ${fullName}?`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ active: !active }).eq("id", profileId);

    if (error) {
      setLoading(false);
      // El trigger de la base de datos devuelve un mensaje ya listo para mostrar
      // cuando esto dejaría a la plataforma sin ningún administrador activo.
      window.alert(error.message || `No pudimos ${action} la cuenta.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: active ? "desactivar_perfil" : "activar_perfil",
      p_module: "administracion",
      p_entity: "profiles",
      p_entity_id: profileId,
      p_details: { full_name: fullName },
    });

    setLoading(false);
    router.refresh();
  }

  if (isSelf) {
    return (
      <span className="text-xs text-slate-400" title="No puedes desactivar tu propia cuenta desde aquí">
        (tu cuenta)
      </span>
    );
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
      {active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
