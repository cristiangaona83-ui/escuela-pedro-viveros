import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SITE } from "@/config/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, var(--color-brand-700) 0%, transparent 45%), radial-gradient(circle at 85% 80%, var(--color-accent-700) 0%, transparent 40%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-brand-100 ring-1 ring-white/20">
            <MapPin className="h-3.5 w-3.5" />
            Tejas Verdes, Llolleo — San Antonio
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            {SITE.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-brand-100">{SITE.slogan}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/nuestra-escuela" variant="accent" size="lg">
              Conoce nuestra escuela
            </LinkButton>
            <a
              href={SITE.domains.platform}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/70 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              Plataforma Pedagógica
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <Image
            src="/images/fachada-escuela.png"
            alt="Fachada de la Escuela Profesor Pedro Viveros Ormeño"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 768px) 480px, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
