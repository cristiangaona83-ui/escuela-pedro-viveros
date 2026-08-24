import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { RecipientForm } from "@/features/weekly-bulletins/RecipientForm";
import { getRecipientById } from "@/services/bulletin-recipients-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar destinatario" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarDestinatarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/informativos");

  const recipient = await getRecipientById(id);
  if (!recipient) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Editar destinatario</h1>
      <Card className="mt-6">
        <CardBody>
          <RecipientForm recipient={recipient} />
        </CardBody>
      </Card>
    </div>
  );
}
