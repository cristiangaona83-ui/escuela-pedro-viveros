import type { Metadata } from "next";
import { FileText, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Proyecto Educativo Institucional" };

export default function ProyectoEducativoPage() {
  return (
    <>
      <PageHeader
        eyebrow="PEI"
        title="Proyecto Educativo Institucional"
        description="Nuestro sello pedagógico, enfoque formativo y los lineamientos que guían el trabajo diario en el aula."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <EmptyState
          icon={FileText}
          title="El Proyecto Educativo Institucional está en preparación"
          description="Cuando la dirección entregue el documento oficial del PEI, podrás consultarlo en detalle aquí y descargarlo desde la sección Documentos Institucionales."
        />
        <div className="mt-8 text-center">
          <LinkButton href="/documentos" variant="secondary">
            Ir a Documentos Institucionales <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </section>
    </>
  );
}
