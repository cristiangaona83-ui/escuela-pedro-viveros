"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function UnpublishBulletinButton({ bulletinId, title }: { bulletinId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnpublish() {
    if (!window.confirm(`¿Despublicar "${title}"? Dejará de verse en el sitio público, pero el PDF y el contenido se conservan.`)) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("weekly_bulletins").update({ published: false }).eq("id", bulletinId);

    if (error) {
      setLoading(false);
      window.alert("No pudimos despublicar el informativo.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "despublicar_informativo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: bulletinId,
      p_details: { title },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleUnpublish}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <EyeOff className="h-3.5 w-3.5" /> Despublicar
    </button>
  );
}
