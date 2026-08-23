import Link from "next/link";
import { MapPin, Mail, Phone, Camera, Play } from "lucide-react";
import { SITE } from "@/config/site";
import { PUBLIC_NAV } from "@/config/navigation";
import { SchoolLogo } from "@/components/ui/SchoolLogo";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { telHref } from "@/lib/utils";

export function Footer() {
  const hasSocials = SITE.socials.facebook || SITE.socials.instagram || SITE.socials.youtube;

  return (
    <footer className="border-t border-slate-800 bg-brand-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <SchoolLogo size={44} />
              <span className="font-heading text-base font-medium tracking-tight text-white">{SITE.name}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-slate-400">{SITE.slogan}</p>
            {hasSocials && (
              <div className="mt-5 flex gap-3">
                {SITE.socials.facebook && (
                  <a
                    href={SITE.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-white/5 p-2 hover:bg-white/10"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
                {SITE.socials.instagram && (
                  <a href={SITE.socials.instagram} className="rounded-lg bg-white/5 p-2 hover:bg-white/10" aria-label="Instagram">
                    <Camera className="h-4 w-4" />
                  </a>
                )}
                {SITE.socials.youtube && (
                  <a href={SITE.socials.youtube} className="rounded-lg bg-white/5 p-2 hover:bg-white/10" aria-label="YouTube">
                    <Play className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-300">Navegación</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {PUBLIC_NAV.slice(0, 6).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-300">Contacto</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-brand-400" />
                <span>{SITE.address.full}</span>
              </li>
              {SITE.phone && (
                <li className="flex gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-brand-400" />
                  <a href={telHref(SITE.phone)} className="hover:text-white">
                    {SITE.phone}
                  </a>
                </li>
              )}
              {SITE.email && (
                <li className="flex gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-brand-400" />
                  <span>{SITE.email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Todos los derechos reservados.
          </p>
          <p>Director: {SITE.director}</p>
        </div>
      </div>
    </footer>
  );
}
