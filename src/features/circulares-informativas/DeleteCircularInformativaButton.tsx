"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePublicFile, pathFromPublicUrl } from "@/lib/supabase/storage";

export function DeleteCircularInformativaButton({ id, title, fileUrl }: { id: string; title: string; fileUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar definitivamente "${title}"? Esta acción no se puede deshacer.`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("circulares_informativas").delete().eq("id", id);
    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar la circular.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "eliminar_circular_informativa",
      p_module: "circulares_informativas",
      p_entity: "circulares_informativas",
      p_entity_id: id,
      p_details: { title },
    });

    const path = pathFromPublicUrl(fileUrl);
    if (path) void deletePublicFile(path);

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
