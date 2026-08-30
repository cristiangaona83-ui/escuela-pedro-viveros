"use client";

import { useEffect, useState } from "react";
import { Eye, Printer, AlertCircle } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { requestPdf } from "@/lib/download-pdf";
import type { BulletinPageSize } from "@/lib/pdf/BulletinDocument";

const STORAGE_KEY = "informativo-tamano-hoja";

/** Vista previa/impresión con tamaño de hoja elegible (Carta u Oficio), generada al vuelo -- no toca el PDF oficial archivado al publicar. La selección se recuerda en localStorage mientras el usuario navega entre informativos, sin persistirla en base de datos. */
export function BulletinPrintPanel({ bulletinId }: { bulletinId: string }) {
  const [pageSize, setPageSize] = useState<BulletinPageSize>("carta");
  const [loading, setLoading] = useState<"preview" | "print" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage (fuente externa) recién montado en el cliente; leerlo en el initializer de useState causaría un mismatch de hidratación con el render del servidor.
    if (stored === "carta" || stored === "oficio") setPageSize(stored);
  }, []);

  function handleSizeChange(value: string) {
    const next: BulletinPageSize = value === "oficio" ? "oficio" : "carta";
    setPageSize(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  async function handleOpen(kind: "preview" | "print") {
    setLoading(kind);
    setError(null);
    const result = await requestPdf(`/plataforma/api/informativos/${bulletinId}/pdf`, { pageSize });
    setLoading(null);
    if (!result.ok) setError(result.error ?? "No se pudo generar el PDF.");
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-slate-500">Tamaño de hoja</label>
        <Select value={pageSize} onChange={(e) => handleSizeChange(e.target.value)}>
          <option value="carta">Carta</option>
          <option value="oficio">Oficio</option>
        </Select>
      </div>
      <button
        type="button"
        onClick={() => handleOpen("preview")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        <Eye className="h-3.5 w-3.5" /> {loading === "preview" ? "Generando…" : "Vista previa"}
      </button>
      <Button type="button" variant="secondary" size="sm" disabled={loading !== null} onClick={() => handleOpen("print")}>
        <Printer className="h-4 w-4" /> {loading === "print" ? "Generando…" : "Imprimir informativo"}
      </Button>
      {error && (
        <div className="flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
