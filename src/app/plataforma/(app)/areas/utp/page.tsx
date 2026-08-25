import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardList, NotebookPen, Target, FileEdit, Activity, Eye, UserCog, Briefcase, FileBarChart, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "UTP" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

const SECTIONS = [
  { title: "Asignaturas", description: "Gestión curricular base.", href: "/plataforma/asignaturas", icon: BookOpen },
  { title: "Evaluaciones", description: "Evaluaciones por curso y asignatura.", href: "/plataforma/evaluaciones", icon: ClipboardList },
  { title: "Calificaciones", description: "Registro de notas.", href: "/plataforma/calificaciones", icon: NotebookPen },
  { title: "Objetivos de Aprendizaje", description: "OA por asignatura y nivel.", href: "/plataforma/objetivos", icon: Target },
  { title: "Planificaciones", description: "Planificaciones docentes y su revisión.", href: "/plataforma/planificaciones", icon: FileEdit },
  { title: "Seguimiento Pedagógico", description: "Seguimiento de dificultades y fortalezas.", href: "/plataforma/seguimiento", icon: Activity },
  { title: "Acompañamiento al Aula", description: "Observaciones de clases.", href: "/plataforma/acompanamiento", icon: Eye },
  { title: "Jefaturas", description: "Asignar profesor/a jefe por curso.", href: "/plataforma/cursos/jefaturas", icon: UserCog },
  { title: "Carga docente", description: "Asignación de asignaturas a docentes.", href: "/plataforma/cursos/carga-docente", icon: Briefcase },
  { title: "Informes", description: "Informes anual, semestral y de cierre de año.", href: "/plataforma/informes", icon: FileBarChart },
];

export default async function UtpHubPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/areas");

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">UTP</h2>
      <p className="mt-1 text-sm text-slate-500">Gestión curricular, planificación, evaluación y acompañamiento docente.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
