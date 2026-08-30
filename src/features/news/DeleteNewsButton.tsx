"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePublicFile, pathFromPublicUrl } from "@/lib/supabase/storage";

/**
 * Borra primero la fila en `news` y, solo si eso tuvo éxito, borra la
 * imagen destacada en Storage (si tenía una) -- mismo orden y mismo
 * criterio que DeleteGalleryButton/DeleteBulletinButton/DeleteDocumentButton,
 * para nunca dejar una fila apuntando a un archivo ya borrado si el borrado
 * de Storage fallara a mitad de camino.
 */
export function DeleteNewsButton({ newsId, title, coverImageUrl }: { newsId: string; title: string; coverImageUrl: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar definitivamente "${title}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("news").delete().eq("id", newsId);
    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar la noticia.");
      return;
    }

    await supabase.rpc("log_audit", { p_action: "eliminar_noticia", p_module: "noticias", p_entity: "news", p_entity_id: newsId, p_details: { title } });

    if (coverImageUrl) {
      const path = pathFromPublicUrl(coverImageUrl);
      if (path) void deletePublicFile(path);
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
      aria-label={`Eliminar ${title}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
