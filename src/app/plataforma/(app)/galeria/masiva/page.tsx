import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { BulkGalleryUploadForm } from "@/features/gallery/BulkGalleryUploadForm";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Subir varias fotografías" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function GaleriaMasivaPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/galeria");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Subir varias fotografías</h1>
      <p className="mt-1 text-sm text-slate-500">
        Selecciona todas las fotografías de una misma actividad de una sola vez. El título, la categoría y la
        descripción se aplican a todas — no necesitas cargarlas una por una.
      </p>
      <Card className="mt-6">
        <CardBody>
          <BulkGalleryUploadForm />
        </CardBody>
      </Card>
    </div>
  );
}
