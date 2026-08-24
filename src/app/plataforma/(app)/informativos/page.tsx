import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Pencil, Download } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { formatBulletinDate } from "@/lib/bulletin-content";
import { PublishBulletinButton } from "@/features/weekly-bulletins/PublishBulletinButton";
import { UnpublishBulletinButton } from "@/features/weekly-bulletins/UnpublishBulletinButton";
import { DuplicateBulletinButton } from "@/features/weekly-bulletins/DuplicateBulletinButton";
import { DeleteBulletinButton } from "@/features/weekly-bulletins/DeleteBulletinButton";
import { listBulletinsAdmin } from "@/services/weekly-bulletins-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Informativos Semanales" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function InformativosAdminPage() {
  const [bulletins, session] = await Promise.all([listBulletinsAdmin(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Informativos Semanales</h1>
          <p className="mt-1 text-sm text-slate-500">Redacta y publica el informativo semanal de la escuela.</p>
        </div>
        {allowedToWrite && <LinkButton href="/plataforma/informativos/nuevo">Nuevo informativo</LinkButton>}
      </div>

      <Card className="mt-6">
        <CardBody className="overflow-x-auto">
          {bulletins.length > 0 ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3">N.º</th>
                  <th className="pb-2 pr-3">Título</th>
                  <th className="pb-2 pr-3">Semana</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulletins.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-3 pr-3 font-medium text-slate-800">{b.number}</td>
                    <td className="max-w-[220px] truncate py-3 pr-3 text-slate-700">{b.title}</td>
                    <td className="max-w-[220px] truncate py-3 pr-3 text-slate-500">{b.week_label}</td>
                    <td className="py-3 pr-3 text-slate-500">{formatBulletinDate(b.publish_date)}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={b.published ? "success" : "neutral"}>{b.published ? "Publicado" : "Borrador"}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allowedToWrite && (
                          <Link
                            href={`/plataforma/informativos/${b.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${b.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        {allowedToWrite && !b.published && <PublishBulletinButton bulletinId={b.id} title={b.title} />}
                        {allowedToWrite && b.published && <UnpublishBulletinButton bulletinId={b.id} title={b.title} />}
                        {b.pdf_url && (
                          <a
                            href={`/api/informativos/${b.number}/pdf`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Download className="h-3.5 w-3.5" /> Descargar PDF
                          </a>
                        )}
                        {allowedToWrite && <DuplicateBulletinButton bulletin={b} />}
                        {allowedToWrite && <DeleteBulletinButton bulletinId={b.id} title={b.title} pdfUrl={b.pdf_url} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={Newspaper} title="Sin informativos" description="Crea el primer Informativo Semanal para la comunidad educativa." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
