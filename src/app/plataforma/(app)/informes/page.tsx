import type { Metadata } from "next";
import { FileBarChart, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { listActiveStudents } from "@/services/certificates";
import { listAcademicYears } from "@/services/courses";
import { listOpenPeriods } from "@/services/academic-scope";
import { SemestralReportForm, AnnualReportForm } from "@/features/reports/ReportGeneratorForms";

export const metadata: Metadata = { title: "Informes" };

export default async function InformesPage() {
  const [students, years, periods] = await Promise.all([
    listActiveStudents(),
    listAcademicYears(),
    listOpenPeriods(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <FileBarChart className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Informes</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Generación de informes de calificaciones en PDF, con folio y registro de emisión.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Informe de Calificaciones Semestral</h2>
            <p className="mt-1 text-xs text-slate-500">Resultados de un período académico específico.</p>
            <div className="mt-4">
              <SemestralReportForm students={students} periods={periods} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Informe Anual de Calificaciones</h2>
            <p className="mt-1 text-xs text-slate-500">Resultados finales del año académico completo.</p>
            <div className="mt-4">
              <AnnualReportForm students={students} academicYears={years} variant="anual" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Informe de Cierre de Año</h2>
            <p className="mt-1 text-xs text-slate-500">Situación final del estudiante al término del año.</p>
            <div className="mt-4">
              <AnnualReportForm students={students} academicYears={years} variant="cierre-anio" />
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No reemplaza el Certificado Anual de Estudios oficial emitido por el MINEDUC.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
