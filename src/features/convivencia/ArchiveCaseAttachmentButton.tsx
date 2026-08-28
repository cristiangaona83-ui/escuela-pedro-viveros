"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Archiva un acta/documento (nunca se borra desde aquí -- ver RLS: solo superadmin puede eliminar actas finalizadas/firmadas). */
export function ArchiveCaseAttachmentButton({ attachmentId, fileName }: { attachmentId: string; fileName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    if (!window.confirm(`¿Archivar "${fileName}"? Dejará de mostrarse como vigente, pero se conserva.`)) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("convivencia_attachments").update({ status: "archivada" }).eq("id", attachmentId);
    if (error) {
      setLoading(false);
      window.alert("No pudimos archivar el documento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "archivar_acta_documento",
      p_module: "convivencia",
      p_entity: "convivencia_attachments",
      p_entity_id: attachmentId,
      p_details: { file_name: fileName },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50"
    >
      <Archive className="h-3.5 w-3.5" /> {loading ? "Archivando…" : "Archivar"}
    </button>
  );
}
