import type { Metadata } from "next";
import { BarChart3, Users, School, ClipboardList, Award } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
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
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Resumen general del sistema. Los reportes exportables a PDF y Excel (asistencia, seguimiento, planificación) se
        incorporarán en la siguiente etapa sobre esta misma base de datos.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((r) => (
          <Card key={r.title}>
            <CardBody>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <r.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-700">{r.title}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{r.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
