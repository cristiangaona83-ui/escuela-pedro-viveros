import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { getNewsBySlug } from "@/services/public-content";
import { parseNewsContent, renderNewsHTML } from "@/lib/news-content";
import { NewsCoverImage } from "@/components/public/NewsCoverImage";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) return { title: "Noticia" };
  return {
    title: news.title,
    description: news.summary,
    openGraph: { title: news.title, description: news.summary, images: news.cover_image_url ? [news.cover_image_url] : undefined },
  };
}

export default async function NoticiaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Badge tone="brand">{news.category}</Badge>
        <span className="text-sm text-slate-400">{formatDate(news.published_at)}</span>
      </div>
      <h1 className="mt-4 font-heading text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">{news.title}</h1>

      {news.cover_image_url ? (
        <NewsCoverImage src={news.cover_image_url} alt={news.title} />
      ) : (
        <div className="relative mt-8 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-300">
          <ImageIcon className="h-12 w-12" strokeWidth={1.5} />
        </div>
      )}

      {/*
        Sin @tailwindcss/typography en el proyecto (verificado: no está en
        package.json ni registrado en globals.css) -- "prose" no generaría
        ningún estilo. Se define el formato directamente con selectores de
        hijo, acotado a este contenedor, para que negrita/cursiva/subrayado/
        alineación/listas/enlaces se vean igual que en el editor de
        administración sin agregar una dependencia nueva.
      */}
      <div
        className="mt-8 max-w-none text-slate-700 [&_a]:text-brand-700 [&_a]:underline [&_a:hover]:text-brand-800 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-slate-900 [&_li]:mb-1 [&_li_p]:my-0 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p:first-child]:mt-0 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: renderNewsHTML(parseNewsContent(news.content)) }}
      />

      {news.gallery_urls.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {news.gallery_urls.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
              <Image src={url} alt={news.title} fill className="object-cover" sizes="200px" />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
