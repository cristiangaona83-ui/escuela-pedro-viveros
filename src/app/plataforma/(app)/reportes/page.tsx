import type { Metadata } from "next";
import { BarChart3, Users, School, ClipboardList, Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getDashboardCounts } from "@/services/dashboard";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const counts = await getDashboardCounts();

  const REPORTS = [
    { title: "Matrícula por curso", icon: School, value: `${counts.courses} cursos activos` },
    { title: "Estudiantes activos", icon: Users, value: `${counts.students} estudiantes` },
    { title: "Evaluaciones registradas", icon: ClipboardList, value: `${counts.evaluations} evaluaciones` },
    { title: "Certificados emitidos", icon: Award, value: `${counts.certificates} documentos` },
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Resumen general del sistema. Los reportes exportables a PDF y Excel (asistencia, seguimiento, planificación) se
        incorporarán en la siguiente etapa sobre esta misma base de datos.
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {REPORTS.map((r) => (
            <div key={r.title} className="px-5 py-5">
              <span className="flex items-center gap-2 text-slate-500">
                <r.icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-xs font-medium uppercase tracking-wide">{r.title}</span>
              </span>
              <p className="mt-2 text-lg font-semibold text-slate-900">{r.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
