"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function RevokeRoleButton({
  userRoleId,
  roleName,
  userName,
  isSelf,
}: {
  userRoleId: string;
  roleName: string;
  userName: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    const confirmMessage = isSelf
      ? `Estás a punto de quitarte a ti mismo el rol "${roleName}". ¿Confirmas?`
      : `¿Quitar el rol "${roleName}" a ${userName}?`;
    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").delete().eq("id", userRoleId);

    if (error) {
      setLoading(false);
      // El trigger de la base de datos devuelve un mensaje ya listo para mostrar
      // cuando esto dejaría a la plataforma sin ningún administrador activo.
      window.alert(error.message || "No pudimos quitar el rol.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "revocar_rol",
      p_module: "administracion",
      p_entity: "user_roles",
      p_entity_id: userRoleId,
      p_details: { role: roleName, user: userName },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRevoke}
      disabled={loading}
      className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 disabled:opacity-50"
      aria-label={`Quitar rol ${roleName} a ${userName}`}
      title="Quitar rol"
    >
      <X className="h-3 w-3" />
    </button>
  );
}
