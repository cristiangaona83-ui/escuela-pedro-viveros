import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Users, Info, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Inspectoría General" };

const ALLOWED_ROLES = ["director", "inspectoria_general", "superadmin"] as const;

const SECTIONS = [
  { title: "Asistencia", description: "Registro diario de asistencia, atrasos y retiros.", href: "/plataforma/asistencia", icon: CalendarCheck },
  { title: "Estudiantes", description: "Ficha, matrícula, retiro/reincorporación y autorizaciones de retiro.", href: "/plataforma/estudiantes", icon: Users },
];

export default async function InspectoriaHubPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/areas");

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Inspectoría General</h2>
      <p className="mt-1 text-sm text-slate-500">Asistencia, retiros, autorizaciones y registro operativo diario.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                  Ir <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 flex items-start gap-1.5 text-xs text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Autorizaciones y restricciones de retiro de cada estudiante se administran desde su ficha, dentro de Estudiantes.
      </p>
    </div>
  );
}
