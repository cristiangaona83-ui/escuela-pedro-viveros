import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { ToggleRecipientActiveButton } from "@/features/weekly-bulletins/ToggleRecipientActiveButton";
import { DeleteRecipientButton } from "@/features/weekly-bulletins/DeleteRecipientButton";
import { listRecipients } from "@/services/bulletin-recipients-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Destinatarios de correo" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

const GROUP_LABEL: Record<string, string> = {
  general: "Destinatarios generales",
  direccion_copia: "Dirección / Copia",
};

export default async function DestinatariosPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/informativos");

  const recipients = await listRecipients();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Destinatarios de correo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quiénes reciben el Informativo Semanal por correo al programar un envío. Lista privada — nunca visible en el sitio público.
          </p>
        </div>
        <LinkButton href="/plataforma/informativos/destinatarios/nuevo">Agregar destinatario</LinkButton>
      </div>

      <Card className="mt-6">
        <CardBody className="overflow-x-auto">
          {recipients.length > 0 ? (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3">Nombre</th>
                  <th className="pb-2 pr-3">Correo</th>
                  <th className="pb-2 pr-3">Grupo</th>
                  <th className="pb-2 pr-3">Tipo</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-3 pr-3 font-medium text-slate-800">{r.full_name}</td>
                    <td className="py-3 pr-3 text-slate-500">{r.email}</td>
                    <td className="py-3 pr-3 text-slate-500">{GROUP_LABEL[r.group_name] ?? r.group_name}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={r.is_primary ? "brand" : "neutral"}>{r.is_primary ? "Principal" : "Alternativo"}</Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone={r.active ? "success" : "neutral"}>{r.active ? "Activo" : "Inactivo"}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/plataforma/informativos/destinatarios/${r.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Editar ${r.full_name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <ToggleRecipientActiveButton recipientId={r.id} active={r.active} fullName={r.full_name} />
                        <DeleteRecipientButton recipientId={r.id} fullName={r.full_name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={Users} title="Sin destinatarios" description="Agrega el primer destinatario para poder programar envíos." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
