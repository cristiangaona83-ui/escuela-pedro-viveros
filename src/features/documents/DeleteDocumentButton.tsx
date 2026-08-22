"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePublicFile, deletePrivateFile, pathFromPublicUrl } from "@/lib/supabase/storage";
import type { DocumentRow } from "@/types/database";

export function DeleteDocumentButton({ document }: { document: DocumentRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${document.title}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("documents").delete().eq("id", document.id);
    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar el documento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "eliminar_documento",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: document.id,
      p_details: { title: document.title },
    });

    // Best-effort: limpia el archivo en Storage (no bloquea si falla).
    if (document.is_public) {
      const path = pathFromPublicUrl(document.file_url);
      if (path) void deletePublicFile(path);
    } else {
      void deletePrivateFile(document.file_url);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={`Eliminar ${document.title}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
