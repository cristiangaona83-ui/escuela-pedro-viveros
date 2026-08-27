import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  CalendarRange,
  Settings2,
  PenTool,
  Users2,
  GraduationCap,
  Newspaper,
  Image as ImageIcon,
  FolderOpen,
  Globe,
  LayoutDashboard,
  ArrowRight,
  LayoutTemplate,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { SITE } from "@/config/site";
import type { RoleCode } from "@/types/database";

export const metadata: Metadata = { title: "Administración" };

type Section = {
  title: string;
  description: string;
  href: string;
  icon: typeof Users;
  external?: boolean;
  /** Si se define, la tarjeta solo se muestra a estos roles -- refleja la restricción real de la página destino, no una nueva. */
  roles?: RoleCode[];
};

const SECTIONS: Section[] = [
  { title: "Ver sitio público", description: "Abre la página pública en una pestaña nueva.", href: SITE.domains.public, icon: Globe, external: true },
  { title: "Configuración institucional", description: "Nombre, RBD, dirección, reconocimiento oficial, escala de notas y redondeo.", href: "/plataforma/administracion/configuracion", icon: Settings2 },
  { title: "Sitio Web", description: "Inicio, Nuestra Escuela y Proyecto Educativo: textos, sellos, valores y tarjetas destacadas.", href: "/plataforma/administracion/sitio-web", icon: LayoutTemplate },
  { title: "Firmas institucionales", description: "Firma del Director y de profesores/as jefes para certificados e informes.", href: "/plataforma/administracion/firmas", icon: PenTool, roles: ["director", "superadmin"] },
  { title: "Equipo institucional", description: "Directivo, PIE y Asistentes de la Educación: nombre, cargo, foto, orden y visibilidad.", href: "/plataforma/equipo-institucional", icon: Users2 },
  { title: "Docentes y Asistentes", description: "Profesor(a) jefe, asistente de aula y docentes de asignatura por curso.", href: "/plataforma/equipo-institucional/cursos", icon: GraduationCap },
  { title: "Noticias", description: "Publica, edita y despublica noticias del sitio público.", href: "/plataforma/noticias", icon: Newspaper },
  { title: "Galería", description: "Álbumes y fotografías del sitio público.", href: "/plataforma/galeria", icon: ImageIcon },
  { title: "Documentos", description: "PEI, Reglamento Interno, protocolos y circulares descargables.", href: "/plataforma/documentos", icon: FolderOpen },
  { title: "Usuarios y roles", description: "Asigna roles del sistema a cada cuenta del equipo.", href: "/plataforma/administracion/usuarios", icon: Users },
  { title: "Años académicos", description: "Crea años, cursos base y administra la apertura/cierre de períodos.", href: "/plataforma/administracion/anios", icon: CalendarRange },
];

export default async function AdministracionPage() {
  const session = await getSessionContext();
  const roles = session?.roles ?? [];
  const visibleSections = SECTIONS.filter((s) => !s.roles || canWrite(roles, s.roles));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Administración</h1>
      <p className="mt-1 text-sm text-slate-500">Panel central de administración institucional y del sitio público.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSections.map((s) => (
          <Link key={s.href} href={s.href} target={s.external ? "_blank" : undefined} rel={s.external ? "noopener noreferrer" : undefined}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  {s.external ? "Abrir" : "Administrar"} <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/plataforma/dashboard" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <LayoutDashboard className="h-4 w-4" /> Volver a Plataforma
      </Link>
    </div>
  );
}
