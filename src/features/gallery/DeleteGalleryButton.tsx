"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePublicFile, pathFromPublicUrl } from "@/lib/supabase/storage";
import type { GalleryRow } from "@/types/database";

/**
 * Borra primero la fila en la base de datos y, solo si eso tuvo éxito,
 * borra los archivos de Storage (miniatura y, si es video, el archivo de
 * video) -- así nunca queda un archivo huérfano por un borrado a medias, y
 * si el borrado de Storage falla no queda una fila "fantasma" apuntando a
 * un archivo que ya no existe (el orden inverso sí podría dejar eso).
 */
export function DeleteGalleryButton({ item }: { item: GalleryRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${item.title}" de la galería? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("gallery").delete().eq("id", item.id);
    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar el elemento.");
      return;
    }

    await supabase.rpc("log_audit", { p_action: "eliminar_galeria", p_module: "galeria", p_entity: "gallery", p_entity_id: item.id, p_details: { title: item.title, media_type: item.media_type } });

    const imagePath = pathFromPublicUrl(item.image_url);
    if (imagePath) void deletePublicFile(imagePath);
    if (item.video_url) {
      const videoPath = pathFromPublicUrl(item.video_url);
      if (videoPath) void deletePublicFile(videoPath);
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
      aria-label={`Eliminar ${item.title}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
