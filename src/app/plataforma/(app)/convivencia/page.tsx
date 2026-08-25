import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, ShieldAlert, Eye, CalendarClock, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/Button";
import { getConvivenciaDashboard } from "@/services/convivencia";
import { listAcademicYears, listCourseOptions } from "@/services/courses";
import { listCaseTypes } from "@/services/convivencia";
import { CASE_STATUS_LABELS } from "@/features/convivencia/labels";

export const metadata: Metadata = { title: "Convivencia Educativa" };

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="truncate">{label}</span>
        <span className="font-medium text-slate-800">{count}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ConvivenciaDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; course?: string; status?: string; type?: string }>;
}) {
  const { year, month, course, status, type } = await searchParams;
  const [years, courses, caseTypes] = await Promise.all([listAcademicYears(), listCourseOptions(), listCaseTypes()]);

  const data = await getConvivenciaDashboard({
    academicYearId: year || undefined,
    month: month ? Number(month) : undefined,
    courseId: course || undefined,
    status: status || undefined,
    caseTypeId: type || undefined,
  });

  const totalOpenish = (data.casesByStatus.abierto ?? 0) + (data.casesByStatus.en_evaluacion ?? 0) + (data.casesByStatus.protocolo_activo ?? 0) + (data.casesByStatus.en_seguimiento ?? 0) + (data.casesByStatus.pendiente_antecedentes ?? 0);

  const cards = [
    { label: "Casos abiertos", value: data.casesByStatus.abierto ?? 0, icon: FolderOpen, href: "/plataforma/convivencia/casos?status=abierto" },
    { label: "En evaluación", value: data.casesByStatus.en_evaluacion ?? 0, icon: Eye, href: "/plataforma/convivencia/casos?status=en_evaluacion" },
    { label: "Protocolos activos", value: data.casesByStatus.protocolo_activo ?? 0, icon: ShieldAlert, href: "/plataforma/convivencia/casos?status=protocolo_activo" },
    { label: "En seguimiento", value: data.casesByStatus.en_seguimiento ?? 0, icon: CalendarClock, href: "/plataforma/convivencia/casos?status=en_seguimiento" },
    { label: "Seguimientos vencidos", value: data.followupsOverdue, icon: CalendarClock, href: "/plataforma/convivencia/seguimientos" },
    { label: "Casos cerrados", value: data.casesByStatus.cerrado ?? 0, icon: CheckCircle2, href: "/plataforma/convivencia/casos?status=cerrado" },
    { label: "Situaciones registradas", value: data.situationsCount, icon: FileText, href: "/plataforma/convivencia/situaciones" },
    { label: "Acciones preventivas", value: data.preventiveActionsCount, icon: Sparkles, href: "/plataforma/convivencia/preventivas" },
  ];

  const maxCourse = Math.max(1, ...data.casesByCourse.map((c) => c.count));
  const maxType = Math.max(1, ...data.casesByType.map((c) => c.count));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Panel general del período seleccionado. {totalOpenish} caso(s) con seguimiento activo.</p>
        <LinkButton href="/plataforma/convivencia/situaciones/nueva" size="sm">
          + Registrar situación
        </LinkButton>
      </div>

      <Card className="mt-4">
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-5">
            <Select name="year" defaultValue={year ?? ""}>
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                </option>
              ))}
            </Select>
            <Select name="month" defaultValue={month ?? ""}>
              <option value="">Todos los meses</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
            <Select name="course" defaultValue={course ?? ""}>
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.level} {c.letter}
                </option>
              ))}
            </Select>
            <Select name="status" defaultValue={status ?? ""}>
              <option value="">Todos los estados</option>
              {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select name="type" defaultValue={type ?? ""}>
              <option value="">Todos los tipos</option>
              {caseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
            <button type="submit" className="sm:col-span-5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Aplicar filtros
            </button>
          </form>
        </CardBody>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody className="py-4">
                <span className="flex items-center gap-2 text-slate-500">
                  <c.icon className="h-4 w-4" strokeWidth={1.75} />
                  <span className="text-[11px] font-medium uppercase tracking-wide">{c.label}</span>
                </span>
                <span className="mt-1 block text-2xl font-semibold text-slate-900">{c.value}</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Casos por curso</h2>
            <div className="mt-4 space-y-3">
              {data.casesByCourse.length > 0 ? (
                data.casesByCourse.map((c) => <Bar key={c.courseLabel} label={c.courseLabel} count={c.count} max={maxCourse} />)
              ) : (
                <p className="text-sm text-slate-400">Sin datos para este período.</p>
              )}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Casos por tipo</h2>
            <div className="mt-4 space-y-3">
              {data.casesByType.length > 0 ? (
                data.casesByType.map((c) => <Bar key={c.label} label={c.label} count={c.count} max={maxType} />)
              ) : (
                <p className="text-sm text-slate-400">Sin datos para este período.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seguimientos vencidos</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{data.followupsOverdue}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seguimientos para hoy</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{data.followupsDueToday}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">% casos cerrados (período)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{data.closedPercent}%</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
