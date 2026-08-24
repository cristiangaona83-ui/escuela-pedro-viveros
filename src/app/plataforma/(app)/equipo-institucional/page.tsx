import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, HeartHandshake, School, UserCog, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Equipo institucional" };

const SECTIONS = [
  { title: "Equipo Directivo", description: "Nombre, cargo, fotografía, orden y visibilidad.", href: "/plataforma/equipo-institucional/directivo", icon: Landmark },
  { title: "Equipo PIE", description: "Nombre, cargo, fotografía, orden y visibilidad.", href: "/plataforma/equipo-institucional/pie", icon: HeartHandshake },
  { title: "Cursos", description: "Docente de jefatura, asistente de aula y docentes de asignatura.", href: "/plataforma/equipo-institucional/cursos", icon: School },
  { title: "Asistentes de la Educación", description: "Nombre, cargo, categoría, fotografía, orden y visibilidad.", href: "/plataforma/equipo-institucional/asistentes", icon: UserCog },
];

export default function EquipoInstitucionalPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Equipo institucional</h1>
      <p className="mt-1 text-sm text-slate-500">
        Administra a las personas que aparecen en el sitio público. Una persona = una fotografía: si alguien
        aparece en más de una sección, se actualiza en un solo lugar.
      </p>

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
