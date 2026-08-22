"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getSignedUrl } from "@/lib/supabase/storage";
import type { DocumentRow } from "@/types/database";

export function DocumentDownloadLink({ document }: { document: DocumentRow }) {
  const [loading, setLoading] = useState(false);

  if (document.is_public) {
    return (
      <a
        href={document.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
      >
        <Download className="h-3.5 w-3.5" /> Descargar
      </a>
    );
  }

  async function handleClick() {
    setLoading(true);
    const url = await getSignedUrl(document.file_url, 60);
    setLoading(false);
    if (!url) {
      window.alert("No pudimos generar el enlace de descarga. Inténtalo nuevamente.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Descargar
    </button>
  );
}
