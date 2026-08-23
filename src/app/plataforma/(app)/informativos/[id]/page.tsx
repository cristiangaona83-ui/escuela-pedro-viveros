import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { BulletinForm } from "@/features/weekly-bulletins/BulletinForm";
import { DuplicateBulletinButton } from "@/features/weekly-bulletins/DuplicateBulletinButton";
import { DeleteBulletinButton } from "@/features/weekly-bulletins/DeleteBulletinButton";
import { getBulletinById } from "@/services/weekly-bulletins-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar informativo" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarInformativoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bulletin, session] = await Promise.all([getBulletinById(id), getSessionContext()]);

  if (!bulletin) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/informativos");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Editar informativo</h1>
        <div className="flex items-center gap-1.5">
          <DuplicateBulletinButton bulletin={bulletin} />
          <DeleteBulletinButton bulletinId={bulletin.id} title={bulletin.title} pdfUrl={bulletin.pdf_url} redirectTo="/plataforma/informativos" />
        </div>
      </div>
      <Card className="mt-6">
        <CardBody>
          <BulletinForm bulletin={bulletin} />
        </CardBody>
      </Card>
    </div>
  );
}
