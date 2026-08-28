import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3, Users, UserCheck, UserX, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, ListFilter,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSchoolAttendanceOverview, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { SemaforoBadge } from "@/features/attendance-reports/SemaforoBadge";
import { IndicatorCard } from "@/features/attendance-reports/IndicatorCard";
import { PeriodFilterBar } from "@/features/attendance-reports/PeriodFilterBar";
import { ExportButtons } from "@/features/attendance-reports/ExportButtons";
import { ThresholdConfigForm } from "@/features/attendance-reports/ThresholdConfigForm";
import { BarComparisonChart } from "@/features/attendance-reports/charts/BarComparisonChart";

export const metadata: Metadata = { title: "Reportes de Asistencia" };

const REPORT_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const CONFIG_ROLES = ["director", "superadmin"] as const;

export default async function AttendanceReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...REPORT_ROLES])) redirect("/plataforma/asistencia");

  const canConfigure = canWrite(session.roles, [...CONFIG_ROLES]);

  const { range, period } = await resolvePeriodFromSearchParams(params);
  const [courses, thresholds] = await Promise.all([getTeachableCourses(), getAttendanceThresholds()]);
  const courseIds = courses.map((c) => c.course_id);
  const overview = await getSchoolAttendanceOverview(courseIds, range, thresholds);
  const { totals } = overview;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-700" />
            <h1 className="text-2xl font-semibold text-slate-900">Panorama de Asistencia</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Visión institucional para {courses.length === 0 ? "tus cursos" : `${courses.length} curso${courses.length === 1 ? "" : "s"}`} · {range.label}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/plataforma/asistencia/reportes/seguimiento" variant="secondary" size="sm">
            <ListFilter className="h-4 w-4" /> Estudiantes en seguimiento
          </LinkButton>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <PeriodFilterBar period={period} from={range.from} to={range.to} />
        {canConfigure && <ThresholdConfigForm thresholds={thresholds} />}
      </div>

      {courseIds.length === 0 ? (
        <EmptyState icon={Users} title="Sin cursos asignados" description="No tienes cursos como docente de asignatura o profesor jefe para ver reportes de asistencia." />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <IndicatorCard icon={UserCheck} label="Asistencia promedio" value={totals.rate !== null ? `${totals.rate}%` : "—"} />
            <IndicatorCard icon={Users} label="Matrícula considerada" value={String(totals.matricula)} />
            <IndicatorCard icon={UserCheck} label="Total presentes" value={String(totals.counts.presente)} />
            <IndicatorCard icon={UserX} label="Total ausentes" value={String(totals.counts.ausente)} />
            <IndicatorCard
              icon={totals.trend !== null && totals.trend < 0 ? TrendingDown : TrendingUp}
              label="Tendencia vs. período anterior"
              value={totals.trend === null ? "—" : `${totals.trend > 0 ? "+" : ""}${totals.trend} pts`}
            />
            <IndicatorCard icon={TrendingUp} label="Curso con mayor asistencia" value={totals.bestCourse ? `${totals.bestCourse.rate}%` : "—"} hint={totals.bestCourse?.courseLabel} />
            <IndicatorCard icon={TrendingDown} label="Curso con menor asistencia" value={totals.worstCourse ? `${totals.worstCourse.rate}%` : "—"} hint={totals.worstCourse?.courseLabel} />
            <IndicatorCard icon={AlertTriangle} label="Bajo 90%" value={String(totals.under90)} />
            <IndicatorCard icon={AlertTriangle} label="Bajo 85%" value={String(totals.under85)} />
            <IndicatorCard icon={AlertTriangle} label="Casos críticos" value={String(totals.critical)} hint={`Bajo ${thresholds.yellow}% (umbral configurable)`} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h2 className="text-sm font-semibold text-slate-900">Asistencia por curso</h2>
                <div className="mt-4">
                  <BarComparisonChart items={overview.courses.map((c) => ({ label: c.courseLabel, rate: c.rate, semaforo: c.semaforo }))} />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h2 className="text-sm font-semibold text-slate-900">Descargar reporte general</h2>
                <p className="mt-1 text-xs text-slate-500">Incluye todos los cursos, matrícula, % de asistencia/inasistencia y estudiantes bajo umbral.</p>
                <div className="mt-4">
                  <ExportButtons endpoint="/plataforma/api/reportes/asistencia/panorama" body={{ period, from: range.from, to: range.to }} filenameBase="panorama-asistencia" />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.courses.map((c) => (
              <Link key={c.courseId} href={`/plataforma/asistencia/reportes/${c.courseId}?period=${period}&from=${range.from}&to=${range.to}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{c.courseLabel}</h3>
                      <SemaforoBadge level={c.semaforo} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm">
                      <dt className="text-slate-500">Matrícula</dt>
                      <dd className="text-right font-medium text-slate-800">{c.matricula}</dd>
                      <dt className="text-slate-500">Asistencia</dt>
                      <dd className="text-right font-medium text-slate-800">{c.rate !== null ? `${c.rate}%` : "—"}</dd>
                      <dt className="text-slate-500">Inasistencia</dt>
                      <dd className="text-right font-medium text-slate-800">{c.rate !== null ? `${Math.round((100 - c.rate) * 10) / 10}%` : "—"}</dd>
                      <dt className="text-slate-500">Bajo {thresholds.yellow}%</dt>
                      <dd className="text-right font-medium text-slate-800">{c.belowYellow}</dd>
                      <dt className="text-slate-500">Días considerados</dt>
                      <dd className="text-right font-medium text-slate-800">{c.diasLectivos}</dd>
                      <dt className="text-slate-500">Tendencia</dt>
                      <dd className="text-right font-medium text-slate-800">
                        {c.trend === null ? "—" : `${c.trend > 0 ? "↑" : c.trend < 0 ? "↓" : "→"} ${Math.abs(c.trend)} pts`}
                      </dd>
                    </dl>
                    <div className="mt-3 flex items-center justify-end text-xs font-medium text-brand-700">
                      Ver detalle <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
