"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ToggleGalleryVisibleButton({
  itemId,
  published,
  title,
}: {
  itemId: string;
  published: boolean;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = published ? "ocultar" : "mostrar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${title}" en el sitio público?`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("gallery").update({ published: !published }).eq("id", itemId);

    if (error) {
      setLoading(false);
      window.alert(`No pudimos ${action} el elemento.`);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: published ? "ocultar_galeria" : "mostrar_galeria",
      p_module: "galeria",
      p_entity: "gallery",
      p_entity_id: itemId,
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
      {published ? "Ocultar" : "Mostrar"}
    </button>
  );
}
