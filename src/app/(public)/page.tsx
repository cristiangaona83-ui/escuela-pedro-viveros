import Link from "next/link";
import { ArrowRight, Newspaper, Clock } from "lucide-react";
import { Hero } from "@/components/public/Hero";
import { NewsCard } from "@/components/public/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getPublishedNews, getContentCards } from "@/services/public-content";
import { getInstitutionalProfile, getHomeAdmissionContent, getHomeScheduleContent } from "@/services/school-config";
import { resolveContentCardIcon } from "@/config/content-icons";
import { SITE } from "@/config/site";
import { ALIGN_CLASS } from "@/lib/content-align";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [news, profile, admission, schedule, highlights] = await Promise.all([
    getPublishedNews(3),
    getInstitutionalProfile(),
    getHomeAdmissionContent(),
    getHomeScheduleContent(),
    getContentCards("inicio_destacados"),
  ]);

  return (
    <>
      <Hero name={profile.name} slogan={profile.slogan} />

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Clock className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2 className="font-heading text-lg font-medium tracking-tight text-slate-900">Horario de estudiantes</h2>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            {schedule.blocks.map((block) => (
              <div key={block.label}>
                <p className="text-sm font-semibold text-brand-700">{block.label}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Entrada: <span className="font-medium text-slate-900">{block.entrada}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Salida: <span className="font-medium text-slate-900">{block.salida}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Postulaciones — bloque principal */}
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-10 sm:px-10 sm:py-12">
            <div className="mx-auto max-w-3xl">
              <div className={ALIGN_CLASS[admission.sae.badgeAlign]}>
                <span className="inline-flex items-center rounded-full bg-brand-700 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                  {admission.sae.badge}
                </span>
              </div>
              <h2 className={cn("mt-4 font-heading text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl", ALIGN_CLASS[admission.sae.titleAlign])}>
                {admission.sae.title}
              </h2>
              <div className="mx-auto mt-4 max-w-2xl space-y-3 leading-relaxed text-slate-600">
                {admission.sae.paragraphs.map((p, i) => (
                  <p key={i} className={ALIGN_CLASS[p.align]}>{p.text}</p>
                ))}
              </div>
              {admission.sae.deadlineLabel && (
                <div className={cn("mt-4", ALIGN_CLASS[admission.sae.deadlineLabelAlign])}>
                  <p className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200">
                    {admission.sae.deadlineLabel}
                  </p>
                </div>
              )}

              <div className="mx-auto mt-8 max-w-xl rounded-xl bg-white/70 px-5 py-6 text-center">
                <p className={cn("font-semibold text-slate-900", ALIGN_CLASS[admission.sae.ctaBoxTitleAlign])}>{admission.sae.ctaBoxTitle}</p>
                <p className={cn("mt-1 text-sm text-slate-600", ALIGN_CLASS[admission.sae.ctaBoxTextAlign])}>{admission.sae.ctaBoxText}</p>
                <div className="mt-5">
                  <LinkButton href={admission.sae.ctaHref} target="_blank" rel="noopener noreferrer" size="lg">
                    {admission.sae.ctaText}
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>

          {/* Vacantes — bloque secundario, visualmente distinto */}
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className={ALIGN_CLASS[admission.vacantes.badgeAlign]}>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {admission.vacantes.badge}
                </span>
              </div>
              <h3 className={cn("mt-3 font-heading text-xl font-medium tracking-tight text-slate-900", ALIGN_CLASS[admission.vacantes.titleAlign])}>
                {admission.vacantes.title}
              </h3>
              <div className="mx-auto mt-3 max-w-2xl space-y-2 text-sm leading-relaxed text-slate-600">
                {admission.vacantes.paragraphs.map((p, i) => (
                  <p key={i} className={ALIGN_CLASS[p.align]}>{p.text}</p>
                ))}
              </div>
              <div className="mt-5">
                <LinkButton
                  href={admission.vacantes.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                >
                  {admission.vacantes.ctaText}
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = resolveContentCardIcon(item.icon);
            return (
              <Link
                key={item.id}
                href={item.href ?? "#"}
                className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-200"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Ver más <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
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
            Pedagógica {profile.name}.
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
