import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, ArrowRightLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { AcademicYearForm } from "@/features/admin/AcademicYearForm";
import { PeriodStatusToggle } from "@/features/admin/PeriodStatusToggle";
import { SetCurrentYearButton } from "@/features/admin/SetCurrentYearButton";

export const metadata: Metadata = { title: "Años académicos" };

export default async function AniosPage() {
  const supabase = await createClient();
  const session = await getSessionContext();
  const canSetCurrent = canWrite(session?.roles ?? [], ["director", "superadmin"]);

  const [{ data: years }, { data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from("academic_years").select("*, academic_periods(*)").order("year", { ascending: true }),
    supabase.from("courses").select("academic_year_id").eq("active", true),
    supabase.from("enrollments").select("academic_year_id").eq("status", "activa"),
  ]);

  const coursesByYear = new Map<string, number>();
  for (const c of courses ?? []) coursesByYear.set(c.academic_year_id, (coursesByYear.get(c.academic_year_id) ?? 0) + 1);
  const enrollmentsByYear = new Map<string, number>();
  for (const e of enrollments ?? []) enrollmentsByYear.set(e.academic_year_id, (enrollmentsByYear.get(e.academic_year_id) ?? 0) + 1);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Años académicos</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Los años 2026 a 2050 ya están creados, cada uno con su Primer y Segundo Semestre. El <strong>año vigente</strong> es el que se abre por
            defecto; cada persona puede ver otro año con el selector de la barra superior. Solo Dirección puede cerrar un período.
          </p>
        </div>
        <LinkButton href="/plataforma/administracion/traspaso" size="sm">
          <ArrowRightLeft className="h-4 w-4" /> Traspaso de año
        </LinkButton>
      </div>

      <Card className="mt-6">
        <CardBody>
          <AcademicYearForm />
        </CardBody>
      </Card>

      <div className="mt-6 space-y-3">
        {years && years.length > 0 ? (
          years.map((y) => {
            const periods =
              (y as unknown as { academic_periods: { id: string; name: string; order_index: number; status: "abierto" | "cerrado" }[] }).academic_periods ?? [];
            const courseCount = coursesByYear.get(y.id) ?? 0;
            const enrollmentCount = enrollmentsByYear.get(y.id) ?? 0;
            return (
              <Card key={y.id}>
                <CardBody className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">{y.year}</h2>
                      {y.active && <Badge tone="success">Vigente</Badge>}
                      <span className="text-xs text-slate-500">
                        {courseCount} curso{courseCount === 1 ? "" : "s"} · {enrollmentCount} matrícula{enrollmentCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!y.active && canSetCurrent && <SetCurrentYearButton yearId={y.id} year={y.year} />}
                      {enrollmentCount > 0 && (
                        <Link
                          href={`/plataforma/administracion/traspaso?from=${y.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" /> Traspasar al siguiente año
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {periods
                      .slice()
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((p) => (
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
