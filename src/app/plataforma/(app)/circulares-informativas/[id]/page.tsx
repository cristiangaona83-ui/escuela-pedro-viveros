import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { CircularInformativaForm } from "@/features/circulares-informativas/CircularInformativaForm";
import { getCircularInformativaById } from "@/services/circulares-informativas";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar Circular Informativa" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarCircularInformativaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/circulares-informativas");

  const circular = await getCircularInformativaById(id);
  if (!circular) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar Circular Informativa</h1>
      <Card className="mt-6">
        <CardBody>
          <CircularInformativaForm circular={circular} />
        </CardBody>
      </Card>
    </div>
  );
}
