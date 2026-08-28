"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getSignedUrl } from "@/lib/supabase/storage";

/** Descarga forzada (no solo "ver") de un acta/documento privado -- trae el contenido vía la URL firmada de corta duración y lo entrega como archivo con su nombre original, sin exponer nunca una URL pública fija. */
export function DownloadCaseAttachmentButton({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const url = await getSignedUrl(storagePath, 120);
    if (!url) {
      setLoading(false);
      window.alert("No pudimos generar el enlace de descarga.");
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.alert("No pudimos descargar el archivo.");
    }
    setLoading(false);
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50">
      <Download className="h-3.5 w-3.5" /> {loading ? "Descargando…" : "Descargar"}
    </button>
  );
}
