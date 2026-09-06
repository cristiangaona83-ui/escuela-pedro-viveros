import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { CircularInformativaForm } from "@/features/circulares-informativas/CircularInformativaForm";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nueva Circular Informativa" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NuevaCircularInformativaPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/circulares-informativas");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nueva Circular Informativa</h1>
      <Card className="mt-6">
        <CardBody>
          <CircularInformativaForm />
        </CardBody>
      </Card>
    </div>
  );
}
