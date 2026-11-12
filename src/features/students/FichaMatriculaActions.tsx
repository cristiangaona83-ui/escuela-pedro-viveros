"use client";

import { useState } from "react";
import { FileDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Ficha de matrícula (formato de Inspectoría General) del año de trabajo. */
export function FichaMatriculaActions({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/plataforma/api/matricula/ficha?student_id=${studentId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo generar la ficha.");
        return;
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={handleDownload} disabled={loading}>
        <FileDown className="h-4 w-4" /> {loading ? "Generando…" : "Imprimir / Descargar PDF"}
      </Button>
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
