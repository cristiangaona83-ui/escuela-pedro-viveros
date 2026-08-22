import type { Metadata } from "next";
import Link from "next/link";
import {
  Users, School, ClipboardList, NotebookPen, FileEdit, CalendarCheck,
  HeartHandshake, Award, FolderOpen, BarChart3, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getSessionContext, ROLE_LABELS } from "@/features/auth/session";
import { getDashboardCounts } from "@/services/dashboard";

export const metadata: Metadata = { title: "Panel Principal" };

const CARDS = [
  { title: "Estudiantes", href: "/plataforma/estudiantes", icon: Users, key: "students" as const },
  { title: "Cursos", href: "/plataforma/cursos", icon: School, key: "courses" as const },
  { title: "Evaluaciones", href: "/plataforma/evaluaciones", icon: ClipboardList, key: "evaluations" as const },
  { title: "Certificados emitidos", href: "/plataforma/certificados", icon: Award, key: "certificates" as const },
];

const QUICK_LINKS = [
  { title: "Calificaciones", href: "/plataforma/calificaciones", icon: NotebookPen },
  { title: "Asistencia", href: "/plataforma/asistencia", icon: CalendarCheck },
  { title: "Planificaciones", href: "/plataforma/planificaciones", icon: FileEdit },
  { title: "PIE", href: "/plataforma/pie", icon: HeartHandshake },
  { title: "Documentos", href: "/plataforma/documentos", icon: FolderOpen },
  { title: "Reportes", href: "/plataforma/reportes", icon: BarChart3 },
];

export default async function DashboardPage() {
  const [session, counts] = await Promise.all([getSessionContext(), getDashboardCounts()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Panel Principal</h1>
      <p className="mt-1 text-slate-500">
        Bienvenido{session?.profile?.full_name ? `, ${session.profile.full_name}` : ""}.{" "}
        {session?.roles.length ? `Rol: ${session.roles.map((r) => ROLE_LABELS[r]).join(", ")}.` : ""}
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-2 px-5 py-5 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-slate-500">
                <card.icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-xs font-medium uppercase tracking-wide">{card.title}</span>
              </span>
              <span className="text-3xl font-semibold text-slate-900">{counts[card.key]}</span>
            </Link>
          ))}
        </div>
      </Card>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500">Accesos rápidos</h2>
      <Card className="mt-4 overflow-hidden">
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <p className="flex-1 text-sm font-medium text-slate-700">{item.title}</p>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
