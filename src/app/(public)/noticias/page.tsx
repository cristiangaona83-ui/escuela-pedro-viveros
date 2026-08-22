import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { NewsCard } from "@/components/public/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPublishedNews } from "@/services/public-content";

export const metadata: Metadata = { title: "Noticias" };

export default async function NoticiasPage() {
  const news = await getPublishedNews();

  return (
    <>
      <PageHeader eyebrow="Comunidad escolar" title="Noticias y actividades" />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {news.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Newspaper}
            title="Aún no hay noticias publicadas"
            description="Las novedades de la escuela aparecerán aquí en cuanto el equipo directivo publique la primera noticia desde la plataforma."
          />
        )}
      </section>
    </>
  );
}
