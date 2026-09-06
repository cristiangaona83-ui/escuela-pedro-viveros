import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Pencil, Download } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { ToggleCircularVisibilityButton } from "@/features/circulares-informativas/ToggleCircularVisibilityButton";
import { DeleteCircularInformativaButton } from "@/features/circulares-informativas/DeleteCircularInformativaButton";
import { listCircularesInformativasAdmin } from "@/services/circulares-informativas";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Circulares Informativas" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function CircularesInformativasAdminPage() {
  const [circulares, session] = await Promise.all([listCircularesInformativasAdmin(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Circulares Informativas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Circulares publicadas en la sección “Circulares Informativas” del sitio web público, independiente de Documentos.
          </p>
        </div>
        {allowedToWrite && <LinkButton href="/plataforma/circulares-informativas/nueva">Nueva circular</LinkButton>}
      </div>

      <Card className="mt-6">
        <CardBody className="overflow-x-auto">
          {circulares.length > 0 ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3">N.º</th>
                  <th className="pb-2 pr-3">Título</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 pr-3">Orden</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {circulares.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-3 pr-3 text-slate-600">{c.document_number ?? "—"}</td>
                    <td className="max-w-[260px] py-3 pr-3">
                      <p className="truncate font-medium text-slate-800">{c.title}</p>
                      {c.description && <p className="mt-0.5 truncate text-xs text-slate-500">{c.description}</p>}
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{formatDate(c.circular_date)}</td>
                    <td className="py-3 pr-3 text-slate-500">{c.display_order}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={c.visible ? "success" : "neutral"}>{c.visible ? "Visible" : "Oculta"}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allowedToWrite && (
                          <Link
                            href={`/plataforma/circulares-informativas/${c.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${c.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Download className="h-3.5 w-3.5" /> Ver
                        </a>
                        {allowedToWrite && <ToggleCircularVisibilityButton id={c.id} title={c.title} visible={c.visible} />}
                        {allowedToWrite && <DeleteCircularInformativaButton id={c.id} title={c.title} fileUrl={c.file_url} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={ScrollText} title="Sin circulares" description="Crea la primera Circular Informativa para la comunidad educativa." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
