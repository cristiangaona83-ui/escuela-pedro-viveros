import type { Metadata } from "next";
import { BookOpen, Target, Eye, Award, HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { getInstitutionalProfile, getNuestraEscuelaContent } from "@/services/school-config";
import { getContentCards } from "@/services/public-content";

export const metadata: Metadata = { title: "Nuestra Escuela" };

export default async function NuestraEscuelaPage() {
  const [profile, content, sellos, valores] = await Promise.all([
    getInstitutionalProfile(),
    getNuestraEscuelaContent(),
    getContentCards("nuestra_escuela_sellos"),
    getContentCards("nuestra_escuela_valores"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Nuestra Escuela"
        title={profile.name}
        description={`Ubicada en ${profile.address.full}.`}
      />

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-center">
          <BookOpen className="h-6 w-6 shrink-0 text-brand-700" />
          <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Historia y trayectoria</h2>
        </div>
        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-slate-600 sm:text-base">
          {content.historyParagraphs.map((p, i) => (
            <p key={i} className="text-justify">{p}</p>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-brand-700" />
                <h3 className="text-lg font-semibold text-slate-900">Misión</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{content.mission}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-brand-700" />
                <h3 className="text-lg font-semibold text-slate-900">Visión</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{content.vision}</p>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-brand-700" />
          <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Sellos educativos</h2>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sellos.map((seal) => (
            <Card key={seal.id}>
              <CardBody>
                <h3 className="font-semibold text-slate-900">{seal.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{seal.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <HeartHandshake className="h-6 w-6 text-brand-700" />
            <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Valores institucionales</h2>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {valores.map((value) => (
              <Card key={value.id}>
                <CardBody>
                  <h3 className="font-semibold text-slate-900">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
