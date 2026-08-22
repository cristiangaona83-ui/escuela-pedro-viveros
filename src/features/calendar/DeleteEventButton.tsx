"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar el evento "${title}"?`)) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      setLoading(false);
      window.alert("No pudimos eliminar el evento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "eliminar_evento",
      p_module: "calendario",
      p_entity: "events",
      p_entity_id: eventId,
      p_details: { title },
    });

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
