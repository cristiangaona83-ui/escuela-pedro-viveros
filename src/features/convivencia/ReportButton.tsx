"use client";

import { useState } from "react";
import { FileDown, AlertCircle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requestPdf } from "@/lib/download-pdf";

/** Reporte PDF generado bajo demanda (punto 16) — nunca se guarda
 * permanentemente, se genera y descarga cada vez que se solicita. */
export function ReportButton({ reportType, title, description, academicYearId }: { reportType: string; title: string; description: string; academicYearId?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await requestPdf("/plataforma/api/convivencia/reportes", { report_type: reportType, academic_year_id: academicYearId });
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Error desconocido");
  }

  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
        <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={handleClick} disabled={loading}>
          <FileDown className="h-4 w-4" /> {loading ? "Generando…" : "Generar PDF"}
        </Button>
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
