import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users, UserCheck, CalendarDays, Scale } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getTeachableCourses } from "@/services/academic-scope";
import { getCourseAttendanceDetail, getSchoolAttendanceOverview, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { IndicatorCard } from "@/features/attendance-reports/IndicatorCard";
import { PeriodFilterBar } from "@/features/attendance-reports/PeriodFilterBar";
import { ExportButtons } from "@/features/attendance-reports/ExportButtons";
import { SemaforoBadge } from "@/features/attendance-reports/SemaforoBadge";
import { TrendLineChart } from "@/features/attendance-reports/charts/TrendLineChart";
import { CourseStudentTable } from "@/features/attendance-reports/CourseStudentTable";

export const metadata: Metadata = { title: "Asistencia por curso" };

const REPORT_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const BROAD_ACCESS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

export default async function CourseAttendanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...REPORT_ROLES])) redirect("/plataforma/asistencia");

  // Defensa en profundidad: para docente, el curso pedido debe estar entre
  // los que getTeachableCourses() ya le reconoce -- mismo criterio que
  // listado-curso (no confiar solo en RLS ni en la UI).
  if (!canWrite(session.roles, [...BROAD_ACCESS_ROLES])) {
    const teachable = await getTeachableCourses();
    if (!teachable.some((c) => c.course_id === courseId)) redirect("/plataforma/asistencia/reportes");
  }

  const { range, period } = await resolvePeriodFromSearchParams(sp);
  const thresholds = await getAttendanceThresholds();

  const allCourses = await getTeachableCourses();
  const [detail, overview] = await Promise.all([
    getCourseAttendanceDetail(courseId, range, thresholds),
    getSchoolAttendanceOverview(allCourses.map((c) => c.course_id), range, thresholds),
  ]);
  if (!detail) notFound();

  const schoolRate = overview.totals.rate;
  const semaforo = detail.rate !== null ? overview.courses.find((c) => c.courseId === courseId)?.semaforo ?? "sin_datos" : "sin_datos";
  const comparison = schoolRate !== null && detail.rate !== null ? Math.round((detail.rate - schoolRate) * 10) / 10 : null;

  return (
    <div>
      <Link href="/plataforma/asistencia/reportes" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Panorama de Asistencia
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Asistencia → {detail.courseLabel}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Profesor/a jefe: {detail.teacherName ?? "—"} · {range.label}
          </p>
        </div>
        <SemaforoBadge level={semaforo} />
      </div>

      <div className="mt-6">
        <PeriodFilterBar period={period} from={range.from} to={range.to} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IndicatorCard icon={UserCheck} label="% General" value={detail.rate !== null ? `${detail.rate}%` : "—"} />
        <IndicatorCard icon={Users} label="Matrícula" value={String(detail.matricula)} />
        <IndicatorCard icon={CalendarDays} label="Días considerados" value={String(detail.diasLectivos)} />
        <IndicatorCard
          icon={Scale}
          label="Curso vs. escuela"
          value={comparison === null ? "—" : `${comparison > 0 ? "+" : ""}${comparison} pts`}
          hint={schoolRate !== null ? `Escuela: ${schoolRate}%` : undefined}
        />
      </div>

      <Card className="mt-6">
        <CardBody>
          <h2 className="text-sm font-semibold text-slate-900">Evolución mensual</h2>
          <div className="mt-4">
            <TrendLineChart points={detail.monthlyEvolution.map((m) => ({ label: m.monthLabel, rate: m.rate }))} referenceRate={schoolRate} />
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Descargar reporte del curso</h2>
            <ExportButtons
              endpoint="/plataforma/api/reportes/asistencia/curso"
              body={{ course_id: courseId, period, from: range.from, to: range.to }}
              filenameBase={`asistencia-${detail.courseLabel.replace(/\s+/g, "-").toLowerCase()}`}
            />
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <h2 className="text-sm font-semibold text-slate-900">Listado de estudiantes</h2>
          <div className="mt-4">
            <CourseStudentTable courseId={courseId} students={detail.students} canSeeRun={true} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
