"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, AlertCircle, ClipboardList } from "lucide-react";
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
  subjectsPending = [],
}: {
  tipo: string;
  courseId: string;
  courseLabel: string;
  year: string;
  period?: string;
  pendingCount: number;
  availableCount: number;
  /** Detalle de asignaturas con calificaciones incompletas (no confundir con pendingCount, que mide informes sin notas suficientes -- ver getCourseGradeDetail). Solo se usa para enriquecer el aviso previo a imprimir; no bloquea la impresión. */
  subjectsPending?: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrint() {
    setError(null);
    if (availableCount === 0) {
      window.alert(`Ningún estudiante de ${courseLabel} tiene el informe completo todavía.`);
      return;
    }
    if (pendingCount > 0 || subjectsPending.length > 0) {
      const detail = subjectsPending.length > 0 ? `\n\nCalificaciones pendientes:\n${subjectsPending.map((s) => `- ${s}`).join("\n")}` : "";
      const proceed = window.confirm(
        `Este curso tiene ${pendingCount} informe${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} de completar.${detail}\n\n` +
          `Puede imprimir únicamente los ${availableCount} informes disponibles, o cancelar para revisar las calificaciones pendientes.\n\n` +
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
      {subjectsPending.length > 0 && (
        <div className="mb-3 flex flex-wrap items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Calificaciones pendientes: {subjectsPending.join(" · ")}.{" "}
            <Link
              href={`/plataforma/calificaciones/${courseId}?year=${year}${period ? `&period=${period}` : ""}`}
              className="inline-flex items-center gap-1 font-medium text-amber-900 hover:underline"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Revisar calificaciones
            </Link>
          </span>
        </div>
      )}
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
