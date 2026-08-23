import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock, Navigation, Link2 } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { ContactForm } from "@/components/public/ContactForm";
import { Card, CardBody } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import { telHref } from "@/lib/utils";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactoPage() {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.mapsQuery)}`;
  const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(SITE.mapsQuery)}&output=embed`;

  return (
    <>
      <PageHeader eyebrow="Contacto" title="Conversemos" description="Estamos disponibles para responder tus consultas." />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            <Card>
              <CardBody className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="font-medium text-slate-900">{SITE.name}</p>
                    <p className="text-sm text-slate-500">{SITE.address.full}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-brand-700" />
                  {SITE.phone ? (
                    <a href={telHref(SITE.phone)} className="text-sm text-slate-500 hover:text-brand-700">
                      {SITE.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">Teléfono por confirmar</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-brand-700" />
                  <p className="text-sm text-slate-500">{SITE.email ?? "Correo por confirmar"}</p>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-brand-700" />
                  <p className="text-sm text-slate-500">{SITE.schedule ?? "Horario de atención por confirmar"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
                  >
                    <Navigation className="h-4 w-4" /> Cómo llegar
                  </a>
                  {SITE.socials.facebook && (
                    <a
                      href={SITE.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50"
                    >
                      <Link2 className="h-4 w-4" /> Síguenos en Facebook
                    </a>
                  )}
                </div>
              </CardBody>
            </Card>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <iframe
                title="Ubicación de la escuela"
                src={mapsEmbed}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900">Envíanos un mensaje</h2>
              <p className="mt-1 text-sm text-slate-500">Completa el formulario y te responderemos a la brevedad.</p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </CardBody>
          </Card>
        </div>
      </section>
    </>
  );
}
