import type { Metadata } from "next";
import { FileText, ArrowRight, Download } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { getPublicDocuments } from "@/services/public-content";
import { getProyectoEducativoContent } from "@/services/school-config";
import { ALIGN_CLASS } from "@/lib/content-align";

export const metadata: Metadata = { title: "Proyecto Educativo Institucional" };

export default async function ProyectoEducativoPage() {
  const [documents, content] = await Promise.all([getPublicDocuments(), getProyectoEducativoContent()]);
  const peiDocument = documents.find((doc) => doc.category === "PEI");

  return (
    <>
      <PageHeader
        eyebrow="PEI"
        title="Proyecto Educativo Institucional"
        description="Nuestro sello pedagógico, enfoque formativo y los lineamientos que guían el trabajo diario en el aula."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-center">
          <FileText className="h-6 w-6 shrink-0 text-brand-700" />
          <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">Proyecto Educativo Institucional</h2>
        </div>

        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-slate-600 sm:text-base">
          {content.introParagraphs.map((p, i) => (
            <p key={i} className={ALIGN_CLASS[p.align]}>{p.text}</p>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {peiDocument && (
            <LinkButton href={peiDocument.file_url} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" /> Ver / Descargar PEI
            </LinkButton>
          )}
          <LinkButton href="/documentos" variant="secondary">
            Ir a Documentos Institucionales <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </section>
    </>
  );
}
