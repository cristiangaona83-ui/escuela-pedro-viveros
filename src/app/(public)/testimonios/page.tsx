import type { Metadata } from "next";
import { Quote, MessageCircleHeart } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { TestimonialForm } from "@/components/public/TestimonialForm";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { getApprovedTestimonials } from "@/services/public-content";

export const metadata: Metadata = { title: "Testimonios" };

export default async function TestimoniosPage() {
  const testimonials = await getApprovedTestimonials();

  return (
    <>
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Testimonios de nuestras familias"
        description="Apoderados y apoderadas comparten su experiencia y la de sus hijos e hijas en la Escuela Profesor Pedro Viveros Ormeño."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {testimonials.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="h-full">
                <CardBody className="flex h-full flex-col gap-3">
                  <Quote className="h-6 w-6 shrink-0 text-brand-300" />
                  <p className="flex-1 text-sm leading-relaxed text-slate-700">{t.message}</p>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-sm font-semibold text-slate-900">{t.full_name}</p>
                    {t.relationship && <p className="text-xs text-slate-500">{t.relationship}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(t.created_at)}</p>
                  </div>
                </CardBody>
              </Card>
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
