import type { Metadata } from "next";
import Link from "next/link";
import { Images, Pencil, UploadCloud, Video, PlaySquare as YoutubeIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { GalleryForm } from "@/features/gallery/GalleryForm";
import { ToggleGalleryVisibleButton } from "@/features/gallery/ToggleGalleryVisibleButton";
import { DeleteGalleryButton } from "@/features/gallery/DeleteGalleryButton";
import { ReorderGalleryButtons } from "@/features/gallery/ReorderGalleryButtons";
import { listGalleryAdmin } from "@/services/gallery-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Galería" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function GaleriaAdminPage() {
  const [items, session] = await Promise.all([listGalleryAdmin(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Galería</h1>
          <p className="mt-1 text-sm text-slate-500">Administra las fotografías y videos visibles en el sitio público.</p>
        </div>
        {allowedToWrite && (
          <LinkButton href="/plataforma/galeria/masiva" variant="secondary" size="sm">
            <UploadCloud className="h-4 w-4" /> Subir varias fotografías
          </LinkButton>
        )}
      </div>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            {items.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {items.map((g, i) => {
                  const prev = i > 0 ? { id: items[i - 1].id, orderIndex: items[i - 1].order_index } : null;
                  const next = i < items.length - 1 ? { id: items[i + 1].id, orderIndex: items[i + 1].order_index } : null;
                  return (
                    <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {g.media_type === "video" && <Video className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
                          {g.media_type === "youtube" && <YoutubeIcon className="h-3.5 w-3.5 shrink-0 text-red-600" />}
                          <p className="truncate text-sm font-medium text-slate-800">{g.title}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {g.category}
                          {g.event_date && ` · ${formatDate(g.event_date)}`}
                          {g.media_type === "video" && g.optimized_size_bytes && (
                            ` · ${formatMb(g.optimized_size_bytes)}${g.savings_percent != null ? ` (-${g.savings_percent}%)` : ""}`
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge tone={g.published ? "success" : "neutral"}>{g.published ? "Visible" : "Oculto"}</Badge>
                        {allowedToWrite && (
                          <>
                            <ReorderGalleryButtons id={g.id} orderIndex={g.order_index} prev={prev} next={next} />
                            <Link
                              href={`/plataforma/galeria/${g.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`Editar ${g.title}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <ToggleGalleryVisibleButton itemId={g.id} published={g.published} title={g.title} />
                            <DeleteGalleryButton item={g} />
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Images} title="Sin publicaciones" description="Agrega la primera fotografía o video a la galería." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nueva publicación</h2>
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
