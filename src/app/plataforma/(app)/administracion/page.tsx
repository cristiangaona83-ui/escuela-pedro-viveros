import type { Metadata } from "next";
import Link from "next/link";
import { Users, CalendarRange, Settings2, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Administración" };

const SECTIONS = [
  { title: "Usuarios y roles", description: "Asigna roles del sistema a cada cuenta del equipo.", href: "/plataforma/administracion/usuarios", icon: Users },
  { title: "Años académicos", description: "Crea años, cursos base y administra la apertura/cierre de períodos.", href: "/plataforma/administracion/anios", icon: CalendarRange },
  { title: "Configuración institucional", description: "Escala de notas, redondeo, firma para certificados y datos base.", href: "/plataforma/administracion/configuracion", icon: Settings2 },
];

export default function AdministracionPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Administración</h1>
      <p className="mt-1 text-sm text-slate-500">Configuración general del sistema, disponible para Dirección y Superadministrador.</p>

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
