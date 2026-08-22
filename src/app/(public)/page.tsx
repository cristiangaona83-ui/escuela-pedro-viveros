import Link from "next/link";
import {
  BookOpen,
  HeartHandshake,
  Users2,
  ArrowRight,
  Newspaper,
} from "lucide-react";
import { Hero } from "@/components/public/Hero";
import { NewsCard } from "@/components/public/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getPublishedNews } from "@/services/public-content";
import { SITE } from "@/config/site";

const HIGHLIGHTS = [
  {
    icon: BookOpen,
    title: "Proyecto Educativo",
    description: "Nuestra propuesta pedagógica, sellos institucionales y forma de acompañar a cada estudiante.",
    href: "/proyecto-educativo",
  },
  {
    icon: HeartHandshake,
    title: "Programa de Integración Escolar",
    description: "Un equipo especializado que apoya a estudiantes y familias con trabajo colaborativo.",
    href: "/equipo-pie",
  },
  {
    icon: Users2,
    title: "Equipo Directivo",
    description: "Conoce a quienes lideran la gestión pedagógica y administrativa de la escuela.",
    href: "/equipo-directivo",
  },
];

export default async function HomePage() {
  const news = await getPublishedNews(3);

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <item.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                Ver más <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Noticias y actividades</h2>
              <p className="mt-2 text-slate-500">Lo último de la vida escolar en la comunidad educativa.</p>
            </div>
            <LinkButton href="/noticias" variant="secondary">
              Ver todas las noticias
            </LinkButton>
          </div>

          <div className="mt-8">
            {news.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {news.map((item) => (
                  <NewsCard key={item.id} news={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Newspaper}
                title="Aún no hay noticias publicadas"
                description="Las novedades de la escuela aparecerán aquí en cuanto el equipo directivo publique la primera noticia desde la plataforma."
              />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-brand-800 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">¿Formas parte de nuestra comunidad?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Docentes, equipo directivo y profesionales PIE acceden a la gestión académica desde la Plataforma
            Pedagógica {SITE.name}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href="/contacto" variant="outline" size="lg">
              Contáctanos
            </LinkButton>
            <a
              href={SITE.domains.platform}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 text-base font-semibold text-white shadow-sm hover:bg-accent-600"
            >
              Ir a la Plataforma Pedagógica
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
