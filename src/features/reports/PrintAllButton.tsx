"use client";

import { useState } from "react";
import { Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestPdf } from "@/lib/download-pdf";

const MASIVO_URL: Record<string, string> = {
  semestral: "/plataforma/api/informes/semestral/masivo",
  anual: "/plataforma/api/informes/anual/masivo",
  "cierre-anio": "/plataforma/api/informes/cierre-anio/masivo",
};

/**
 * Imprimir todos los informes del curso -- un solo PDF con todos los
 * informes disponibles, cada estudiante en su propia página (ver rutas
 * .../masivo). Si hay pendientes, avisa antes de imprimir solo los
 * disponibles, en vez de bloquear silenciosamente o generar documentos
 * vacíos.
 */
export function PrintAllButton({
  tipo,
  courseId,
  courseLabel,
  year,
  period,
  pendingCount,
  availableCount,
}: {
  tipo: string;
  courseId: string;
  courseLabel: string;
  year: string;
  period?: string;
  pendingCount: number;
  availableCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrint() {
    setError(null);
    if (availableCount === 0) {
      window.alert(`Ningún estudiante de ${courseLabel} tiene el informe completo todavía.`);
      return;
    }
    if (pendingCount > 0) {
      const proceed = window.confirm(
        `Este curso tiene ${pendingCount} informe${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} de completar.\n\n` +
          `Puede imprimir únicamente los ${availableCount} informes disponibles, o cancelar para completar los pendientes.\n\n` +
          `¿Imprimir los ${availableCount} informes disponibles?`
      );
      if (!proceed) return;
    }

    setLoading(true);
    const url = MASIVO_URL[tipo];
    const body = tipo === "semestral" ? { course_id: courseId, period_id: period } : { course_id: courseId, academic_year_id: year };
    const result = await requestPdf(url, body);
    setLoading(false);
    if (!result.ok) setError(result.error ?? "No se pudo generar la impresión masiva.");
  }

  return (
    <div>
      <Button type="button" onClick={handlePrint} disabled={loading}>
        <Printer className="h-4 w-4" /> {loading ? "Generando…" : "Imprimir todos los informes"}
      </Button>
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
