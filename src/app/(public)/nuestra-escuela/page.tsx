import type { Metadata } from "next";
import { BookOpen, Target, Eye, Award, HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import { HISTORY, MISSION, VISION, EDUCATIONAL_SEALS, VALUES } from "@/config/institutional-content";

export const metadata: Metadata = { title: "Nuestra Escuela" };

export default function NuestraEscuelaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Nuestra Escuela"
        title={SITE.name}
        description={`Ubicada en ${SITE.address.full}.`}
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-brand-700" />
          <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Historia y trayectoria</h2>
        </div>
        {HISTORY.paragraphs.length > 0 ? (
          <div className="mt-4 space-y-4 text-slate-600">
            {HISTORY.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={BookOpen}
              title="Historia en preparación"
              description="Este espacio publicará la historia y trayectoria de la escuela apenas la dirección entregue el contenido oficial."
            />
          </div>
        )}
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-brand-700" />
                <h3 className="text-lg font-semibold text-slate-900">Misión</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {MISSION ?? "Contenido en preparación — se publicará cuando sea entregado por la dirección."}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-brand-700" />
                <h3 className="text-lg font-semibold text-slate-900">Visión</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {VISION ?? "Contenido en preparación — se publicará cuando sea entregado por la dirección."}
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-brand-700" />
          <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Sellos educativos</h2>
        </div>
        {EDUCATIONAL_SEALS.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {EDUCATIONAL_SEALS.map((seal) => (
              <Card key={seal.title}>
                <CardBody>
                  <h3 className="font-semibold text-slate-900">{seal.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{seal.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState icon={Award} title="Sellos educativos por definir" description="Se publicarán aquí una vez formalizados por el equipo directivo." />
          </div>
        )}
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <HeartHandshake className="h-6 w-6 text-brand-700" />
            <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Valores institucionales</h2>
          </div>
          {VALUES.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {VALUES.map((value) => (
                <Card key={value.title}>
                  <CardBody>
                    <h3 className="font-semibold text-slate-900">{value.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{value.description}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState icon={HeartHandshake} title="Valores en preparación" description="Se publicarán aquí una vez definidos por el equipo directivo." />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
