import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { BulletinForm } from "@/features/weekly-bulletins/BulletinForm";
import { getNextBulletinNumber } from "@/services/weekly-bulletins-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nuevo informativo" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NuevoInformativoPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/informativos");

  const suggestedNumber = await getNextBulletinNumber();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo informativo</h1>
      <Card className="mt-6">
        <CardBody>
          <BulletinForm suggestedNumber={suggestedNumber} />
        </CardBody>
      </Card>
    </div>
  );
}
