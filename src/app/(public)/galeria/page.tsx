import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { GalleryGrid } from "@/components/public/GalleryGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { getGallery } from "@/services/public-content";

export const metadata: Metadata = { title: "Galería" };

export default async function GaleriaPage() {
  const items = await getGallery();

  return (
    <>
      <PageHeader eyebrow="Vida escolar" title="Galería de fotografías" />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {items.length > 0 ? (
          <GalleryGrid items={items} />
        ) : (
          <EmptyState
            icon={ImageIcon}
            title="Galería en construcción"
            description="Las fotografías de actividades y eventos se publicarán aquí, organizadas por categoría."
          />
        )}
      </section>
    </>
  );
}
