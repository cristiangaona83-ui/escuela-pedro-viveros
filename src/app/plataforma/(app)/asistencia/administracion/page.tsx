import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarOff, Plus, CalendarDays, CalendarCheck, Ban, Undo2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getTeachableCourses } from "@/services/academic-scope";
import { resolvePeriodFromSearchParams, getAttendanceCalendarSummary } from "@/services/attendance-analytics";
import { listSuspensions } from "@/services/class-suspensions";
import { IndicatorCard } from "@/features/attendance-reports/IndicatorCard";
import { PeriodFilterBar } from "@/features/attendance-reports/PeriodFilterBar";
import { SuspensionFilterBar } from "@/features/attendance-reports/SuspensionFilterBar";
import { VoidSuspensionButton } from "@/features/attendance-reports/VoidSuspensionButton";
import { SUSPENSION_REASON_LABELS, SUSPENSION_KIND_LABELS, type SuspensionKind, type SuspensionReasonType } from "@/lib/attendance/suspensions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Administrar calendario — Asistencia" };

const REPORT_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const ADMIN_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function AttendanceCalendarAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; courseId?: string; kind?: string; reasonType?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...REPORT_ROLES])) redirect("/plataforma/asistencia");
  const canManage = canWrite(session.roles, [...ADMIN_ROLES]);

  const { range, period } = await resolvePeriodFromSearchParams(sp);
  const courses = await getTeachableCourses();
  const courseIds = courses.map((c) => c.course_id);

  const kindFilter = (sp.kind as SuspensionKind) || undefined;
  const reasonTypeFilter = (sp.reasonType as SuspensionReasonType) || undefined;

  const [summary, suspensions] = await Promise.all([
    getAttendanceCalendarSummary(courseIds, range),
    listSuspensions({ from: range.from, to: range.to, courseId: sp.courseId || undefined, kind: kindFilter, reasonType: reasonTypeFilter }),
  ]);

  return (
    <div>
      <Link href="/plataforma/asistencia" className="text-xs font-medium text-brand-700 hover:underline">
        ← Asistencia
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-brand-700" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Administrar calendario</h1>
            <p className="mt-1 text-sm text-slate-500">Suspensiones de clases y días recuperados — {range.label}.</p>
          </div>
        </div>
        {canManage && (
          <LinkButton href="/plataforma/asistencia/administracion/nueva" size="sm">
            <Plus className="h-4 w-4" /> Registrar suspensión
          </LinkButton>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <PeriodFilterBar period={period} from={range.from} to={range.to} />
        <SuspensionFilterBar courses={courses} courseId={sp.courseId ?? ""} kind={sp.kind ?? ""} reasonType={sp.reasonType ?? ""} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IndicatorCard icon={CalendarDays} label="Días lectivos programados" value={String(summary.diasLectivosProgramados)} />
        <IndicatorCard icon={CalendarCheck} label="Días trabajados" value={String(summary.diasTrabajados)} />
        <IndicatorCard icon={Ban} label="Días suspendidos" value={String(summary.diasSuspendidos)} />
        <IndicatorCard icon={Undo2} label="Días recuperados" value={String(summary.diasRecuperados)} />
      </div>

      <Card className="mt-6">
        <CardBody>
          {suspensions.length === 0 ? (
            <EmptyState icon={CalendarOff} title="Sin registros en este período" description="Ajusta el período o los filtros para ver otros registros." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Motivo</th>
                    <th className="py-2 pr-3">Alcance</th>
                    <th className="py-2 pr-3">Jornada</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Registrado por</th>
                    {canManage && <th className="py-2 pr-3">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {suspensions.map((s) => (
                    <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${s.status === "anulada" ? "opacity-50" : ""}`}>
                      <td className="py-2 pr-3 text-slate-700">{formatDate(s.suspension_date)}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={s.kind === "recuperacion" ? "success" : "warning"}>{SUSPENSION_KIND_LABELS[s.kind]}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{s.reason_type ? SUSPENSION_REASON_LABELS[s.reason_type] : "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{s.scope === "escuela" ? "Toda la escuela" : s.courses.map((c) => c.label).join(", ") || "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{s.full_day ? "Completa" : `Parcial${s.start_time ? ` ${s.start_time.slice(0, 5)}–${s.end_time?.slice(0, 5) ?? ""}` : ""}`}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={s.status === "activa" ? "neutral" : "danger"}>{s.status === "activa" ? "Activa" : "Anulada"}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-slate-500">{s.createdByName}</td>
                      {canManage && (
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-3">
                            <Link href={`/plataforma/asistencia/administracion/${s.id}/editar`} className="text-xs font-medium text-brand-700 hover:underline">
                              Editar
                            </Link>
                            {s.status === "activa" && (
                              <VoidSuspensionButton suspensionId={s.id} label={`${SUSPENSION_KIND_LABELS[s.kind]} — ${formatDate(s.suspension_date)}`} />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
