import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ListFilter } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getTeachableCourses } from "@/services/academic-scope";
import { getFollowupList, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { PeriodFilterBar } from "@/features/attendance-reports/PeriodFilterBar";
import { FollowupFilterBar } from "@/features/attendance-reports/FollowupFilterBar";
import { SemaforoBadge } from "@/features/attendance-reports/SemaforoBadge";
import { ExportButtons } from "@/features/attendance-reports/ExportButtons";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Estudiantes en seguimiento" };

const REPORT_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;

export default async function AttendanceFollowupPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; maxRate?: string; minConsecutive?: string; mondayFriday?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...REPORT_ROLES])) redirect("/plataforma/asistencia");

  const { range, period } = await resolvePeriodFromSearchParams(sp);
  const [courses, thresholds] = await Promise.all([getTeachableCourses(), getAttendanceThresholds()]);
  const courseIds = courses.map((c) => c.course_id);

  const maxRate = sp.maxRate ? Number(sp.maxRate) : undefined;
  const minConsecutiveAbsences = sp.minConsecutive ? Number(sp.minConsecutive) : undefined;
  const mondayFridayOnly = sp.mondayFriday === "1";

  const rows = await getFollowupList(courseIds, range, thresholds, { maxRate, minConsecutiveAbsences, mondayFridayOnly });

  return (
    <div>
      <Link href="/plataforma/asistencia/reportes" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Panorama de Asistencia
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <ListFilter className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Estudiantes que requieren seguimiento</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">{range.label} · {rows.length} estudiante{rows.length === 1 ? "" : "s"} bajo el criterio seleccionado.</p>

      <div className="mt-6 space-y-3">
        <PeriodFilterBar period={period} from={range.from} to={range.to} />
        <FollowupFilterBar maxRate={sp.maxRate ?? ""} minConsecutive={sp.minConsecutive ?? ""} mondayFriday={mondayFridayOnly} />
      </div>

      <div className="mt-4">
        <ExportButtons
          endpoint="/plataforma/api/reportes/asistencia/seguimiento"
          body={{ period, from: range.from, to: range.to, maxRate, minConsecutiveAbsences, mondayFridayOnly }}
          filenameBase="seguimiento-asistencia"
          csv
        />
      </div>

      <Card className="mt-6">
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState icon={ListFilter} title="Sin estudiantes bajo este criterio" description="Ajusta el período o los filtros para ver otros casos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Estudiante</th>
                    <th className="py-2 pr-3">Curso</th>
                    <th className="py-2 pr-3 text-center">%</th>
                    <th className="py-2 pr-3 text-center">Ausencias</th>
                    <th className="py-2 pr-3 text-center">Consecutivas</th>
                    <th className="py-2 pr-3">Última presencia</th>
                    <th className="py-2 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.studentId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-2 pr-3">
                        <Link href={`/plataforma/asistencia/reportes/${r.courseId}/${r.studentId}`} className="font-medium text-brand-700 hover:underline">
                          {r.fullName}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{r.courseLabel}</td>
                      <td className="py-2 pr-3 text-center font-medium text-slate-800">{r.rate !== null ? `${r.rate}%` : "—"}</td>
                      <td className="py-2 pr-3 text-center text-slate-600">{r.absences}</td>
                      <td className="py-2 pr-3 text-center text-slate-600">{r.consecutiveAbsences}</td>
                      <td className="py-2 pr-3 text-slate-600">{r.lastPresence ? formatDate(r.lastPresence) : "—"}</td>
                      <td className="py-2 pr-3">
                        <SemaforoBadge level={r.semaforo} />
                      </td>
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
