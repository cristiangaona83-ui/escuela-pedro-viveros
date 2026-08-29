"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePrivateFile } from "@/lib/supabase/storage";

/** Quita el timbre institucional -- borra la fila school_config (así los PDF vuelven a mostrar solo la firma, exactamente como antes de que existiera el timbre) y el archivo de Storage. */
export function RemoveStampButton({ storagePath }: { storagePath: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!window.confirm("¿Quitar el timbre del Director? Los documentos volverán a mostrar solo la firma.")) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("school_config").delete().eq("key", "institutional_stamp");
    if (error) {
      setLoading(false);
      window.alert("No pudimos quitar el timbre.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "quitar_timbre",
      p_module: "firmas",
      p_entity: "school_config",
      p_entity_id: "institutional_stamp",
      p_details: { storage_path: storagePath },
    });

    void deletePrivateFile(storagePath);

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> {loading ? "Quitando…" : "Quitar timbre"}
    </button>
  );
}
