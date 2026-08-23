"use client";

import { useState } from "react";
import { FileDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestPdf } from "@/lib/download-pdf";

export function FichaMatriculaActions({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    const result = await requestPdf("/plataforma/api/reportes/ficha-matricula", { student_id: studentId });
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Error desconocido");
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
