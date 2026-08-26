"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstitutionalSignatureKind } from "@/types/database";

export function ToggleSignatureActiveButton({
  signatureId,
  kind,
  staffMemberId,
  active,
  displayName,
}: {
  signatureId: string;
  kind: InstitutionalSignatureKind;
  staffMemberId: string | null;
  active: boolean;
  displayName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = active ? "desactivar" : "activar";
    const confirmMessage = active
      ? `¿Desactivar la firma de ${displayName}? Los certificados dejarán de mostrarla hasta que actives otra.`
      : `¿Activar esta firma de ${displayName}? Reemplazará a la firma actualmente activa de este tipo.`;
    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (active) {
      const { error } = await supabase
        .from("institutional_signatures")
        .update({ active: false, updated_by: authData.user?.id })
        .eq("id", signatureId);
      if (error) { setLoading(false); window.alert(`No pudimos ${action} la firma.`); return; }
    } else {
      let deactivateQuery = supabase
        .from("institutional_signatures")
        .update({ active: false, updated_by: authData.user?.id })
        .eq("kind", kind)
        .eq("active", true);
      deactivateQuery = staffMemberId ? deactivateQuery.eq("staff_member_id", staffMemberId) : deactivateQuery.is("staff_member_id", null);
      const { error: deactivateError } = await deactivateQuery;
      if (deactivateError) { setLoading(false); window.alert("No pudimos desactivar la firma actualmente activa."); return; }

      const { error: activateError } = await supabase
        .from("institutional_signatures")
        .update({ active: true, updated_by: authData.user?.id })
        .eq("id", signatureId);
      if (activateError) { setLoading(false); window.alert(`No pudimos ${action} la firma.`); return; }
    }

    await supabase.rpc("log_audit", {
      p_action: active ? "desactivar_firma" : "activar_firma",
      p_module: "firmas",
      p_entity: "institutional_signatures",
      p_entity_id: signatureId,
      p_details: { kind, display_name: displayName },
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
      {active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
