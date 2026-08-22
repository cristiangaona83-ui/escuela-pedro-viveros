import type { Metadata } from "next";
import { FileText, Download, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { getPublicDocuments } from "@/services/public-content";

export const metadata: Metadata = { title: "Documentos Institucionales" };

export default async function DocumentosPage() {
  const documents = await getPublicDocuments();

  return (
    <>
      <PageHeader
        eyebrow="Transparencia"
        title="Documentos Institucionales"
        description="PEI, Reglamento Interno, protocolos, circulares y calendario escolar."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        {documents.length > 0 ? (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{doc.title}</p>
                      <Badge tone="neutral">{doc.category}</Badge>
                      {doc.year && <Badge tone="brand">{doc.year}</Badge>}
                    </div>
                    {doc.description && <p className="mt-1 text-sm text-slate-500">{doc.description}</p>}
                  </div>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <Download className="h-4 w-4" /> Descargar PDF
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Documentos en publicación"
            description="El PEI, Reglamento Interno, protocolos y demás documentos institucionales se publicarán aquí desde la plataforma."
          />
        )}
      </section>
    </>
  );
}
