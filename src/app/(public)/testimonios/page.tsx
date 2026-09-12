import type { Metadata } from "next";
import { Quote, MessageCircleHeart } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { TestimonialForm } from "@/components/public/TestimonialForm";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { getApprovedTestimonials } from "@/services/public-content";

export const metadata: Metadata = { title: "Testimonios" };

function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

export default async function TestimoniosPage() {
  const testimonials = await getApprovedTestimonials();

  return (
    <>
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Experiencias de nuestras familias"
        description="Lo que madres, padres y apoderados nos cuentan sobre su experiencia en la Escuela Profesor Pedro Viveros Ormeño."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {testimonials.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
                <Quote className="h-7 w-7 shrink-0 fill-accent-500 text-accent-500" />
                <p className="mt-3 flex-1 text-justify text-sm leading-relaxed text-slate-700">{t.message}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-brand-50 pt-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                    {initials(t.full_name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.full_name}</p>
                    {t.relationship && <p className="text-xs font-medium text-brand-700">{t.relationship}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(t.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageCircleHeart}
            title="Aún no hay testimonios publicados"
            description="Los comentarios de nuestras familias se publicarán aquí una vez revisados por el establecimiento."
          />
        )}
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6 lg:px-8">
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-slate-900">Comparte tu experiencia</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tu comentario se revisará antes de publicarse en esta página.
            </p>
            <div className="mt-6">
              <TestimonialForm />
            </div>
          </CardBody>
        </Card>
      </section>
    </>
  );
}
