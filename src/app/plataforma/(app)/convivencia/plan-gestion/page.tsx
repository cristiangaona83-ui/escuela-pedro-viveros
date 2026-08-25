import type { Metadata } from "next";
import { Target } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listManagementPlan } from "@/services/convivencia";
import { getActiveAcademicYear } from "@/services/courses";
import { ManagementPlanForm } from "@/features/convivencia/ManagementPlanForm";
import { PLAN_STATUS_LABELS, PLAN_STATUS_TONE } from "@/features/convivencia/labels";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Plan de Gestión — Convivencia Educativa" };

const WRITE_ROLES = ["director", "superadmin", "convivencia"] as const;

export default async function PlanGestionPage() {
  const year = await getActiveAcademicYear();
  const [items, session] = await Promise.all([listManagementPlan(year?.id), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  const avgProgress = items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.progress_percent, 0) / items.length) : 0;

  return (
    <div>
      <Card>
        <CardBody>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avance general del Plan {year ? `— ${year.year}` : ""}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2.5 flex-1 rounded-full bg-slate-100">
              <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${avgProgress}%` }} />
            </div>
            <span className="text-lg font-semibold text-slate-900">{avgProgress}%</span>
          </div>
        </CardBody>
      </Card>

      {allowedToWrite && year && (
        <div className="mt-4">
          <ManagementPlanForm academicYearId={year.id} />
        </div>
      )}

      <Card className="mt-4">
        <CardBody>
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Acción</th>
                    <th className="py-2 pr-4">Responsable</th>
                    <th className="py-2 pr-4">Inicio</th>
                    <th className="py-2 pr-4">Término</th>
                    <th className="py-2 pr-4">Avance</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4 text-slate-800">
                        {p.action}
                        {p.indicator && <p className="text-xs text-slate-400">Indicador: {p.indicator}</p>}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">{p.responsible_name}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{p.start_date ? formatDate(p.start_date) : "—"}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{p.end_date ? formatDate(p.end_date) : "—"}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{p.progress_percent}%</td>
                      <td className="py-2.5">
                        <Badge tone={PLAN_STATUS_TONE[p.status]}>{PLAN_STATUS_LABELS[p.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Target} title="Sin acciones en el Plan de Gestión" description="Agrega la primera acción para comenzar a monitorearla." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
