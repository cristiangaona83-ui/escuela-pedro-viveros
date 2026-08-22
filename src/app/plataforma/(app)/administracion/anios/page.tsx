import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { AcademicYearForm } from "@/features/admin/AcademicYearForm";
import { PeriodStatusToggle } from "@/features/admin/PeriodStatusToggle";

export const metadata: Metadata = { title: "Años académicos" };

export default async function AniosPage() {
  const supabase = await createClient();
  const { data: years } = await supabase
    .from("academic_years")
    .select("*, academic_periods(*)")
    .order("year", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Años académicos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cada año crea automáticamente Primer y Segundo Semestre. Solo Dirección puede cerrar un período.
      </p>

      <Card className="mt-6">
        <CardBody>
          <AcademicYearForm />
        </CardBody>
      </Card>

      <div className="mt-6 space-y-4">
        {years && years.length > 0 ? (
          years.map((y) => {
            const periods = (y as unknown as { academic_periods: { id: string; name: string; status: "abierto" | "cerrado" }[] }).academic_periods ?? [];
            return (
              <Card key={y.id}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">{y.year}</h2>
                    <Badge tone={y.active ? "success" : "neutral"}>{y.active ? "Activo" : "Inactivo"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {periods.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm text-slate-600">
                        {p.name} <PeriodStatusToggle periodId={p.id} status={p.status} />
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={CalendarRange} title="Sin años académicos" description="Crea el primer año académico para comenzar a matricular cursos." />
        )}
      </div>
    </div>
  );
}
