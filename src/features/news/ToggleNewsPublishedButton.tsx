"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleNewsPublishedButton({
  newsId,
  published,
  title,
  publishedAt,
}: {
  newsId: string;
  published: boolean;
  title: string;
  publishedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = published ? "despublicar" : "publicar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${title}"?`)) return;

    setLoading(true);
    const supabase = createClient();
    const nextPublished = !published;
    const { error } = await supabase
      .from("news")
      .update({ published: nextPublished, published_at: nextPublished ? publishedAt ?? new Date().toISOString() : publishedAt })
      .eq("id", newsId);

    if (error) {
      setLoading(false);
      window.alert(`No pudimos ${action} la noticia.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: nextPublished ? "publicar_noticia" : "despublicar_noticia",
      p_module: "noticias",
      p_entity: "news",
      p_entity_id: newsId,
      p_details: { title },
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
        published
          ? "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          : "inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      }
    >
      {published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {published ? "Despublicar" : "Publicar"}
    </button>
  );
}
