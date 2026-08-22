import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SITE } from "@/config/site";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[560px] items-end overflow-hidden bg-brand-950 sm:min-h-[640px] lg:min-h-[720px]">
      <Image
        src="/images/fachada-escuela.png"
        alt="Fachada de la Escuela Profesor Pedro Viveros Ormeño"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/55 to-brand-950/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/80 via-brand-950/10 to-transparent" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/15">
            <MapPin className="h-3.5 w-3.5" />
            Tejas Verdes, Llolleo — San Antonio
          </span>
          <h1 className="mt-5 font-heading text-4xl font-medium leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {SITE.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-white/85">{SITE.slogan}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/nuestra-escuela" variant="accent" size="lg">
              Conoce nuestra escuela
            </LinkButton>
            <a
              href={SITE.domains.platform}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/40 px-6 text-[0.95rem] font-medium text-white transition-colors hover:border-white/70 hover:bg-white/10"
            >
              Plataforma Pedagógica
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
