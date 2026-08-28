"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Descarga un PDF o CSV generado bajo demanda desde una ruta API (nunca se guarda el archivo en el servidor). */
export function ExportButtons({ endpoint, body, filenameBase, csv = true }: { endpoint: string; body: Record<string, unknown>; filenameBase: string; csv?: boolean }) {
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "pdf" | "csv") {
    setLoading(format);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No pudimos generar el reporte.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos generar el reporte.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" disabled={loading !== null} onClick={() => download("pdf")}>
        <FileDown className="h-4 w-4" /> {loading === "pdf" ? "Generando…" : "Descargar PDF"}
      </Button>
      {csv && (
        <Button type="button" variant="secondary" size="sm" disabled={loading !== null} onClick={() => download("csv")}>
          <FileSpreadsheet className="h-4 w-4" /> {loading === "csv" ? "Generando…" : "Exportar CSV"}
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
