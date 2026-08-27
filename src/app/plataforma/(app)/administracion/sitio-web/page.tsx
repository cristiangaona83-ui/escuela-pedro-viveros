import type { Metadata } from "next";
import Link from "next/link";
import { Home, School, FileText, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sitio Web" };

const SECTIONS = [
  { title: "Inicio", description: "Admisión (SAE/Vacantes), horario de estudiantes y tarjetas destacadas.", href: "/plataforma/administracion/sitio-web/inicio", icon: Home },
  { title: "Nuestra Escuela", description: "Historia, misión, visión, sellos educativos y valores institucionales.", href: "/plataforma/administracion/sitio-web/nuestra-escuela", icon: School },
  { title: "Proyecto Educativo", description: "Texto introductorio del PEI.", href: "/plataforma/administracion/sitio-web/proyecto-educativo", icon: FileText },
];

export default function SitioWebAdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Sitio Web</h1>
      <p className="mt-1 text-sm text-slate-500">
        Contenido editable del sitio público. Los datos de contacto (nombre, dirección, teléfono, correo, horario de
        atención, redes sociales) se editan en Configuración Institucional.
      </p>

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
