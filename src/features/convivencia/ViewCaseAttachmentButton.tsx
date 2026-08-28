"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { getSignedUrl } from "@/lib/supabase/storage";

/** Abre una URL firmada de corta duración para un acta/documento privado (nunca una URL pública fija). */
export function ViewCaseAttachmentButton({ storagePath }: { storagePath: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const url = await getSignedUrl(storagePath, 120);
    setLoading(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50">
      <Eye className="h-3.5 w-3.5" /> {loading ? "Abriendo…" : "Ver / descargar"}
    </button>
  );
}
