import type { Metadata } from "next";
import { ReportButton } from "@/features/convivencia/ReportButton";
import { getActiveAcademicYear } from "@/services/courses";

export const metadata: Metadata = { title: "Reportes — Convivencia Educativa" };

export default async function ConvivenciaReportesPage() {
  const year = await getActiveAcademicYear();

  const reports = [
    { type: "resumen_mensual", title: "Resumen mensual", description: "Todos los casos del año académico vigente." },
    { type: "casos_abiertos", title: "Casos abiertos", description: "Casos que aún no están cerrados." },
    { type: "casos_por_curso", title: "Casos por curso", description: "Cantidad de casos agrupados por curso." },
    { type: "casos_por_tipo", title: "Casos por tipo", description: "Cantidad de casos agrupados por tipo de situación." },
    { type: "seguimientos_pendientes", title: "Seguimientos pendientes", description: "Todos los seguimientos aún no realizados." },
    { type: "acciones_preventivas", title: "Acciones preventivas", description: "Actividades formativas y preventivas registradas." },
    { type: "avance_plan", title: "Avance Plan de Gestión", description: "Estado y porcentaje de avance de cada acción del plan." },
  ];

  return (
    <div>
      <p className="text-sm text-slate-500">
        Reportes internos generados bajo demanda — no se almacenan permanentemente. Incluyen datos personales, uso reservado.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <ReportButton key={r.type} reportType={r.type} title={r.title} description={r.description} academicYearId={year?.id} />
        ))}
      </div>
    </div>
  );
}
