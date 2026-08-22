import type { Metadata } from "next";
import Link from "next/link";
import { Images, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { GalleryForm } from "@/features/gallery/GalleryForm";
import { ToggleGalleryVisibleButton } from "@/features/gallery/ToggleGalleryVisibleButton";
import { listGalleryAdmin } from "@/services/gallery-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Galería" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function GaleriaAdminPage() {
  const [items, session] = await Promise.all([listGalleryAdmin(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Galería</h1>
      <p className="mt-1 text-sm text-slate-500">Administra las fotografías visibles en el sitio público.</p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            {items.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {items.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{g.title}</p>
                      <p className="text-xs text-slate-500">
                        {g.category}
                        {g.event_date && ` · ${formatDate(g.event_date)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={g.published ? "success" : "neutral"}>{g.published ? "Visible" : "Oculto"}</Badge>
                      {allowedToWrite && (
                        <>
                          <Link
                            href={`/plataforma/galeria/${g.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${g.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <ToggleGalleryVisibleButton itemId={g.id} published={g.published} title={g.title} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Images} title="Sin fotografías" description="Agrega la primera fotografía a la galería." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nueva fotografía</h2>
              <div className="mt-4">
                <GalleryForm />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
