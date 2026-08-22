import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { DocumentForm } from "@/features/documents/DocumentForm";
import { DeleteDocumentButton } from "@/features/documents/DeleteDocumentButton";
import { DocumentDownloadLink } from "@/features/documents/DocumentDownloadLink";
import { listDocuments, listDocumentCategories } from "@/services/documents";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Documentos" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export default async function DocumentosPlataformaPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [documents, categories, session] = await Promise.all([
    listDocuments(categoria),
    listDocumentCategories(),
    getSessionContext(),
  ]);

  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Documentos</h1>
      <p className="mt-1 text-sm text-slate-500">Publica PEI, Reglamento Interno, protocolos y circulares. Marca cuáles son públicos.</p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <Card>
          <CardBody>
            <form className="mb-4 flex max-w-sm items-end gap-2">
              <div className="flex-1">
                <Select name="categoria" defaultValue={categoria ?? ""}>
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Filtrar
              </button>
            </form>

            {documents.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.title}</p>
                      <p className="text-xs text-slate-500">{d.category}{d.year ? ` · ${d.year}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={d.is_public ? "success" : "neutral"}>{d.is_public ? "Público" : "Interno"}</Badge>
                      <DocumentDownloadLink document={d} />
                      {allowedToWrite && (
                        <>
                          <Link
                            href={`/plataforma/documentos/${d.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${d.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteDocumentButton document={d} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FolderOpen} title="Sin documentos" description="Publica el primer documento institucional." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nuevo documento</h2>
              <div className="mt-4"><DocumentForm /></div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
