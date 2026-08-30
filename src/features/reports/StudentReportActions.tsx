"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Printer, Pencil, Loader2 } from "lucide-react";
import { requestPdf } from "@/lib/download-pdf";

const INDIVIDUAL_URL: Record<string, string> = {
  semestral: "/plataforma/api/informes/semestral",
  anual: "/plataforma/api/informes/anual",
  "cierre-anio": "/plataforma/api/informes/cierre-anio",
};

/**
 * Acciones individuales por estudiante dentro de la nómina del curso --
 * Ver/Imprimir llaman exactamente la misma ruta que ya existía (genera el
 * PDF individual, con su folio real). "Editar" no edita un documento
 * guardado (el informe se genera al vuelo desde las notas) -- enlaza al
 * módulo de Calificaciones, que es donde realmente se edita el dato.
 */
export function StudentReportActions({
  tipo,
  studentId,
  courseId,
  year,
  period,
  available,
}: {
  tipo: string;
  studentId: string;
  courseId: string;
  year: string;
  period?: string;
  available: boolean;
}) {
  const [loading, setLoading] = useState<"ver" | "imprimir" | null>(null);

  async function handleGenerate(kind: "ver" | "imprimir") {
    setLoading(kind);
    const url = INDIVIDUAL_URL[tipo];
    const body = tipo === "semestral" ? { student_id: studentId, period_id: period } : { student_id: studentId, academic_year_id: year };
    const result = await requestPdf(url, body);
    setLoading(null);
    if (!result.ok) window.alert(result.error ?? "No se pudo generar el informe.");
  }

  if (!available) {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Sin notas suficientes</span>
        <Link href={`/plataforma/calificaciones/${courseId}?year=${year}${period ? `&period=${period}` : ""}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => handleGenerate("ver")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
      >
        {loading === "ver" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Ver
      </button>
      <button
        type="button"
        onClick={() => handleGenerate("imprimir")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
      >
        {loading === "imprimir" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Imprimir
      </button>
      <Link href={`/plataforma/calificaciones/${courseId}?year=${year}${period ? `&period=${period}` : ""}`} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Link>
    </div>
  );
}
