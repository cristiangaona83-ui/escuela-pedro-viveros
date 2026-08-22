import type { Metadata } from "next";
import Link from "next/link";
import {
  Users, School, ClipboardList, NotebookPen, FileEdit, CalendarCheck,
  HeartHandshake, Award, FolderOpen, BarChart3,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
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
      <h1 className="text-2xl font-bold text-slate-900">Panel Principal</h1>
      <p className="mt-1 text-slate-500">
        Bienvenido{session?.profile?.full_name ? `, ${session.profile.full_name}` : ""}.{" "}
        {session?.roles.length ? `Rol: ${session.roles.map((r) => ROLE_LABELS[r]).join(", ")}.` : ""}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <card.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="text-2xl font-bold text-slate-900">{counts[card.key]}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-600">{card.title}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Accesos rápidos</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="text-sm font-medium text-slate-700">{item.title}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
