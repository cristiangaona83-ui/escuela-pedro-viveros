import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  School, Users, UserSquare2, BookOpen, ClipboardList, Clock, CheckCircle2, AlertTriangle,
  Activity, History, NotebookPen, Target, FileEdit, Eye, UserCog, Briefcase, FileBarChart, ArrowRight,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getPedagogicalDashboard } from "@/services/pedagogical-dashboard";
import { formatDate, formatGrade } from "@/lib/utils";

export const metadata: Metadata = { title: "Gestión Pedagógica" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

const SECTIONS = [
  { title: "Cursos", description: "Fichas de curso, matrícula y jefaturas.", href: "/plataforma/cursos", icon: School },
  { title: "Estudiantes", description: "Fichas de matrícula del establecimiento.", href: "/plataforma/estudiantes", icon: Users },
  { title: "Asignaturas", description: "Gestión curricular base.", href: "/plataforma/asignaturas", icon: BookOpen },
  { title: "Carga docente", description: "Asignación de asignaturas a docentes.", href: "/plataforma/cursos/carga-docente", icon: Briefcase },
  { title: "Jefaturas", description: "Asignar profesor/a jefe por curso.", href: "/plataforma/cursos/jefaturas", icon: UserCog },
  { title: "Evaluaciones", description: "Evaluaciones por curso y asignatura.", href: "/plataforma/evaluaciones", icon: ClipboardList },
  { title: "Calificaciones", description: "Registro de notas.", href: "/plataforma/calificaciones", icon: NotebookPen },
  { title: "Informes", description: "Informes anual, semestral y de cierre de año.", href: "/plataforma/informes", icon: FileBarChart },
  { title: "Seguimiento Pedagógico", description: "Seguimiento de dificultades y fortalezas.", href: "/plataforma/seguimiento", icon: Activity },
  { title: "Objetivos de Aprendizaje", description: "OA por asignatura y nivel.", href: "/plataforma/objetivos", icon: Target },
  { title: "Planificaciones", description: "Planificaciones docentes y su revisión.", href: "/plataforma/planificaciones", icon: FileEdit },
  { title: "Acompañamiento al Aula", description: "Observaciones de clases.", href: "/plataforma/acompanamiento", icon: Eye },
];

const ACTION_LABELS: Record<string, string> = {
  crear_evaluacion: "creó una evaluación",
  actualizar_evaluacion: "actualizó una evaluación",
  archivar_evaluacion: "archivó una evaluación",
  eliminar_evaluacion: "eliminó una evaluación",
  emitir_informe: "emitió un informe",
  imprimir_informes_curso: "imprimió informes de un curso",
};

export default async function UtpHubPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/areas");

  const dashboard = await getPedagogicalDashboard();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Gestión Pedagógica</h1>
      <p className="mt-1 text-sm text-slate-500">Panel general de UTP: cursos, asignaturas, evaluaciones, calificaciones e informes académicos.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={School} label="Cursos activos" value={dashboard.activeCourses} href="/plataforma/cursos" />
        <StatCard icon={Users} label="Matrícula total" value={dashboard.totalEnrollment} href="/plataforma/estudiantes" />
        <StatCard icon={UserSquare2} label="Docentes" value={dashboard.teacherCount} href="/plataforma/cursos/carga-docente" />
        <StatCard icon={BookOpen} label="Asignaturas" value={dashboard.subjectCount} href="/plataforma/asignaturas" />
        <StatCard icon={ClipboardList} label="Evaluaciones registradas" value={dashboard.evaluationsRegistered} href="/plataforma/evaluaciones" />
        <StatCard
          icon={Clock}
          label="Evaluaciones pendientes"
          value={dashboard.evaluationsPending}
          tone={dashboard.evaluationsPending > 0 ? "warning" : "neutral"}
          href="/plataforma/evaluaciones"
        />
        <StatCard
          icon={CheckCircle2}
          label="% Calificaciones ingresadas"
          value={dashboard.gradeCompletionPercent === null ? "—" : `${dashboard.gradeCompletionPercent}%`}
          tone={dashboard.gradeCompletionPercent !== null && dashboard.gradeCompletionPercent < 100 ? "warning" : "success"}
          href="/plataforma/calificaciones"
        />
        <StatCard
          icon={AlertTriangle}
          label="Cursos con registros incompletos"
          value={dashboard.coursesWithIncompleteRecords}
          tone={dashboard.coursesWithIncompleteRecords > 0 ? "warning" : "success"}
          href="/plataforma/calificaciones"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Alertas pedagógicas</h2>
          <Card className="mt-3">
            <CardBody>
              {dashboard.alerts.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Sin alertas" description="No hay evaluaciones, calificaciones ni informes pendientes por ahora." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dashboard.alerts.map((a) => (
                    <li key={a.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="text-slate-700">{a.label}</span>
                      <Badge tone={a.tone}>{a.count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Actividad académica reciente</h2>
          <Card className="mt-3">
            <CardBody>
              {dashboard.recentActivity.length === 0 ? (
                <EmptyState icon={History} title="Sin actividad reciente" description="Todavía no hay registros de evaluaciones, calificaciones o informes." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dashboard.recentActivity.map((item) => (
                    <li key={item.id} className="py-2.5 text-sm">
                      <span className="text-slate-700">
                        <span className="font-medium">{item.userName ?? "Alguien"}</span> {ACTION_LABELS[item.action] ?? item.action}
                      </span>
                      <p className="mt-0.5 text-xs text-slate-400">{formatDate(item.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {dashboard.courseAverages.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Promedio general por curso</h2>
          <p className="mt-1 text-xs text-slate-500">Enseñanza Básica, período abierto actual.</p>
          <Card className="mt-3 overflow-hidden">
            <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
              {dashboard.courseAverages.map((c) => (
                <Link key={c.courseId} href={`/plataforma/cursos/${c.courseId}`} className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-slate-50">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.courseLabel}</span>
                  <span className="text-xl font-semibold text-slate-900">{formatGrade(c.average)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500">Accesos rápidos</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Administrar <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
