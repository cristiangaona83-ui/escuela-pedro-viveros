import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate, formatRun } from "@/lib/utils";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getTeachableCourses } from "@/services/academic-scope";
import { getStudentAttendanceDetail, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { IndicatorCard } from "@/features/attendance-reports/IndicatorCard";
import { PeriodFilterBar } from "@/features/attendance-reports/PeriodFilterBar";
import { ExportButtons } from "@/features/attendance-reports/ExportButtons";
import { SemaforoBadge } from "@/features/attendance-reports/SemaforoBadge";
import { TrendLineChart } from "@/features/attendance-reports/charts/TrendLineChart";

export const metadata: Metadata = { title: "Resumen de Asistencia del Estudiante" };

const REPORT_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const BROAD_ACCESS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

const STATUS_LABEL: Record<string, string> = { presente: "Presente", ausente: "Ausente", atraso: "Atraso", retiro: "Retiro" };

export default async function StudentAttendanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { courseId, studentId } = await params;
  const sp = await searchParams;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...REPORT_ROLES])) redirect("/plataforma/asistencia");

  if (!canWrite(session.roles, [...BROAD_ACCESS_ROLES])) {
    const teachable = await getTeachableCourses();
    if (!teachable.some((c) => c.course_id === courseId)) redirect("/plataforma/asistencia/reportes");
  }

  const { range, period } = await resolvePeriodFromSearchParams(sp);
  const thresholds = await getAttendanceThresholds();
  const detail = await getStudentAttendanceDetail(studentId, range, thresholds);
  if (!detail) notFound();

  return (
    <div>
      <Link href={`/plataforma/asistencia/reportes/${courseId}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> {detail.courseLabel ?? "Curso"}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resumen de Asistencia del Estudiante</h1>
          <p className="mt-1 text-sm text-slate-500">
            {detail.fullName} · RUN {formatRun(detail.run)} · {detail.courseLabel ?? "—"}
          </p>
        </div>
        <SemaforoBadge level={detail.semaforo} />
      </div>

      <div className="mt-6">
        <PeriodFilterBar period={period} from={range.from} to={range.to} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <IndicatorCard icon={TrendingUp} label="% Anual" value={detail.yearRate !== null ? `${detail.yearRate}%` : "—"} />
        <IndicatorCard icon={TrendingUp} label="% Mensual" value={detail.monthRate !== null ? `${detail.monthRate}%` : "—"} />
        <IndicatorCard icon={TrendingUp} label="% Semanal" value={detail.weekRate !== null ? `${detail.weekRate}%` : "—"} />
        <IndicatorCard
          icon={detail.trend !== null && detail.trend < 0 ? TrendingDown : TrendingUp}
          label="Tendencia (30 días)"
          value={detail.trend === null ? "—" : `${detail.trend > 0 ? "+" : ""}${detail.trend} pts`}
        />
        <IndicatorCard icon={TrendingUp} label="Presentes" value={String(detail.counts.presente)} hint="Año en curso" />
        <IndicatorCard icon={TrendingDown} label="Ausentes" value={String(detail.counts.ausente)} hint="Año en curso" />
        <IndicatorCard icon={TrendingUp} label="Atrasos" value={String(detail.counts.atraso)} hint="Año en curso" />
        <IndicatorCard icon={TrendingDown} label="Retiros" value={String(detail.counts.retiro)} hint="Año en curso" />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Ausencias justificadas/injustificadas: no disponible — el sistema actual no distingue ese dato dentro del registro de asistencia. Última ausencia:{" "}
        {detail.lastAbsence ? formatDate(detail.lastAbsence) : "—"}.
      </p>

      <Card className="mt-6">
        <CardBody>
          <h2 className="text-sm font-semibold text-slate-900">Evolución mensual</h2>
          <div className="mt-4">
            <TrendLineChart points={detail.monthlyEvolution.map((m) => ({ label: m.monthLabel, rate: m.rate }))} />
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Descargar reporte individual</h2>
            <ExportButtons
              endpoint="/plataforma/api/reportes/asistencia/estudiante"
              body={{ student_id: studentId, period, from: range.from, to: range.to }}
              filenameBase={`asistencia-${detail.fullName.replace(/\s+/g, "-").toLowerCase()}`}
              csv={false}
            />
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <h2 className="text-sm font-semibold text-slate-900">Historial de asistencia — {range.label}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Observación</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.map((h, i) => (
                  <tr key={`${h.date}-${i}`} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-700">{formatDate(h.date)}</td>
                    <td className="py-2 pr-3 text-slate-700">{STATUS_LABEL[h.status] ?? h.status}</td>
                    <td className="py-2 pr-3 text-slate-500">{h.observation ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.history.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Sin registros en este período.</p>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
