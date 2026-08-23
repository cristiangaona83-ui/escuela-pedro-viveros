"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePublicFile, pathFromPublicUrl } from "@/lib/supabase/storage";

export function DeleteBulletinButton({
  bulletinId,
  title,
  pdfUrl,
  redirectTo,
}: {
  bulletinId: string;
  title: string;
  pdfUrl: string | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar definitivamente "${title}"? Esta acción no se puede deshacer.`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("weekly_bulletins").delete().eq("id", bulletinId);

    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar el informativo.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "eliminar_informativo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: bulletinId,
      p_details: { title },
    });

    if (pdfUrl) {
      const path = pathFromPublicUrl(pdfUrl);
      if (path) void deletePublicFile(path);
    }

    setLoading(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
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
