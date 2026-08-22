import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { GalleryForm } from "@/features/gallery/GalleryForm";
import { getGalleryItem } from "@/services/gallery-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar fotografía" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarGaleriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, session] = await Promise.all([getGalleryItem(id), getSessionContext()]);

  if (!item) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/galeria");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar fotografía</h1>
      <Card className="mt-6">
        <CardBody>
          <GalleryForm item={item} />
        </CardBody>
      </Card>
    </div>
  );
}
