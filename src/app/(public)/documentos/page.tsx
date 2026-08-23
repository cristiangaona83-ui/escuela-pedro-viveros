import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Download, FolderOpen, Megaphone, Eye } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { getPublicDocuments, getPublishedBulletins } from "@/services/public-content";

export const metadata: Metadata = { title: "Documentos Institucionales" };

export default async function DocumentosPage() {
  const [documents, bulletins] = await Promise.all([getPublicDocuments(), getPublishedBulletins()]);

  return (
    <>
      <PageHeader
        eyebrow="Transparencia"
        title="Documentos Institucionales"
        description="PEI, Reglamento Interno, protocolos, circulares y calendario escolar."
      />

      <section className="mx-auto max-w-4xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Megaphone className="h-4.5 w-4.5" />
          </span>
          <h2 className="font-heading text-xl font-medium tracking-tight text-slate-900">Informativos Semanales</h2>
        </div>

        {bulletins.length > 0 ? (
          <ul className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {bulletins.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium text-slate-900">Informativo Semanal N.º {b.number}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {b.week_label} · {formatDate(b.publish_date)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/documentos/informativos/${b.number}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  >
                    <Eye className="h-4 w-4" /> Ver informativo
                  </Link>
                  {b.pdf_url && (
                    <a
                      href={b.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" /> Descargar PDF
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={Megaphone}
              title="Aún no hay informativos publicados"
              description="El Informativo Semanal se publicará aquí cada semana desde la plataforma."
            />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <FolderOpen className="h-4.5 w-4.5" />
          </span>
          <h2 className="font-heading text-xl font-medium tracking-tight text-slate-900">Documentos</h2>
        </div>
        <div className="mt-5">
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
        </div>
      </section>
    </>
  );
}
