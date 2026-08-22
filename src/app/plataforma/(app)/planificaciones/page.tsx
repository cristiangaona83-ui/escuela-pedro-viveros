import type { Metadata } from "next";
import Link from "next/link";
import { FileEdit } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { formatDate } from "@/lib/utils";
import { listLessonPlans } from "@/services/lesson-plans";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Planificaciones" };

const STATUS_TONE = { borrador: "neutral", enviada: "brand", revisada: "warning", aprobada: "success", observada: "danger" } as const;
const STATUS_LABEL = { borrador: "Borrador", enviada: "Enviada", revisada: "Revisada", aprobada: "Aprobada", observada: "Observada" } as const;
const WRITE_ROLES = ["director", "utp", "docente", "superadmin"] as const;

export default async function PlanificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const status = estado && estado in STATUS_LABEL ? (estado as keyof typeof STATUS_LABEL) : undefined;
  const [plans, session] = await Promise.all([listLessonPlans({ status }), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Planificaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Unidades, objetivos y actividades por clase, con seguimiento de revisión de UTP y Dirección.
          </p>
        </div>
        {allowedToWrite && <LinkButton href="/plataforma/planificaciones/nueva">Nueva planificación</LinkButton>}
      </div>

      <Card className="mt-6">
        <CardBody>
          <form className="mb-4 flex max-w-sm items-end gap-2">
            <div className="flex-1">
              <Select name="estado" defaultValue={estado ?? ""}>
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Filtrar
            </button>
          </form>

          {plans.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {plans.map((p) => (
                <li key={p.id} className="py-3">
                  <Link href={`/plataforma/planificaciones/${p.id}`} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.unit}</p>
                      <p className="text-xs text-slate-500">
                        {p.courses ? `${p.courses.level} ${p.courses.letter}` : "—"} · {p.subjects?.name} · {p.teacher?.full_name}
                        {p.plan_date && ` · ${formatDate(p.plan_date)}`}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileEdit} title="Sin planificaciones" description="Crea la primera planificación de clase." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
