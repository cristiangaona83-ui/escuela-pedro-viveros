import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { RecipientForm } from "@/features/weekly-bulletins/RecipientForm";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nuevo destinatario" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NuevoDestinatarioPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/informativos");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo destinatario</h1>
      <Card className="mt-6">
        <CardBody>
          <RecipientForm />
        </CardBody>
      </Card>
    </div>
  );
}
