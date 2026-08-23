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

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Postulaciones SAE 2027 — bloque principal */}
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-10 sm:px-10 sm:py-12">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full bg-brand-700 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                Admisión 2027
              </span>
              <h2 className="mt-4 font-heading text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
                ¡Postulaciones SAE 2027 abiertas! 🏫✨
              </h2>
              <div className="mx-auto mt-4 max-w-2xl space-y-3 text-left leading-relaxed text-slate-600">
                <p>
                  Ya se encuentra abierto el Periodo Principal de Postulación del Sistema de Admisión Escolar
                  (SAE) para el año 2027.
                </p>
                <p>
                  Las familias tienen plazo hasta el <strong>jueves 27 de agosto a las 14:00 horas</strong> para
                  revisar establecimientos, ordenar sus preferencias y enviar su postulación.
                </p>
                <p>
                  <strong>Recuerda:</strong> el proceso no es por orden de llegada. Puedes realizar tu
                  postulación con calma dentro del plazo establecido; el día y la hora en que la envíes no
                  influyen en el resultado.
                </p>
              </div>

              <div className="mx-auto mt-8 max-w-xl rounded-xl bg-white/70 px-5 py-6">
                <p className="font-semibold text-slate-900">
                  ¿Quieres ser parte de la Escuela Profesor Pedro Viveros Ormeño en 2027?
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Ingresa al Sistema de Admisión Escolar y realiza tu postulación dentro del plazo.
                </p>
                <div className="mt-5">
                  <LinkButton href="https://www.sistemadeadmisionescolar.cl/" target="_blank" rel="noopener noreferrer" size="lg">
                    Postular en SAE
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>

          {/* Vacantes 2026 — bloque secundario, visualmente distinto */}
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Vacantes 2026
              </span>
              <h3 className="mt-3 font-heading text-xl font-medium tracking-tight text-slate-900">
                ¿Necesitas una vacante para este año?
              </h3>
              <div className="mx-auto mt-3 max-w-2xl space-y-2 text-left text-sm leading-relaxed text-slate-600">
                <p>
                  Si necesitas matrícula durante el año escolar 2026 o no obtuviste un cupo mediante el proceso
                  regular, puedes utilizar Anótate en la Lista, plataforma oficial del Ministerio de Educación
                  para solicitar vacantes disponibles.
                </p>
                <p>
                  Las solicitudes se realizan en línea y las vacantes disponibles se gestionan respetando el
                  orden de llegada registrado en la plataforma.
                </p>
              </div>
              <div className="mt-5">
                <LinkButton
                  href="https://www.sistemadeadmisionescolar.cl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                >
                  Anótate en la Lista
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-200"
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
              <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">Noticias y actividades</h2>
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
        <div className="rounded-xl bg-brand-900 px-6 py-14 text-center sm:px-12">
          <h2 className="font-heading text-2xl font-medium tracking-tight text-white sm:text-3xl">¿Formas parte de nuestra comunidad?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100/90">
            Docentes, equipo directivo y profesionales PIE acceden a la gestión académica desde la Plataforma
            Pedagógica {SITE.name}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/contacto" variant="outline" size="lg">
              Contáctanos
            </LinkButton>
            <a
              href={SITE.domains.platform}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-accent-600"
            >
              Ir a la Plataforma Pedagógica
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
