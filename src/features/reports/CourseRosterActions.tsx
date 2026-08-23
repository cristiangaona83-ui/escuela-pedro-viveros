"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestPdf } from "@/lib/download-pdf";

export function CourseRosterActions({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePdf() {
    setLoading("pdf");
    setError(null);
    const result = await requestPdf("/plataforma/api/reportes/listado-curso", { course_id: courseId, format: "pdf" });
    setLoading(null);
    if (!result.ok) setError(result.error ?? "Error desconocido");
  }

  async function handleCsv() {
    setLoading("csv");
    setError(null);
    const response = await fetch("/plataforma/api/reportes/listado-curso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, format: "csv" }),
    });
    setLoading(null);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo generar el CSV.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listado-${courseId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handlePdf} disabled={loading !== null}>
          <FileDown className="h-4 w-4" /> {loading === "pdf" ? "Generando…" : "Descargar PDF"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleCsv} disabled={loading !== null}>
          <FileSpreadsheet className="h-4 w-4" /> {loading === "csv" ? "Generando…" : "Descargar CSV"}
        </Button>
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
