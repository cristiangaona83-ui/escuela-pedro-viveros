import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { getNewsBySlug } from "@/services/public-content";

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
      <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">{news.title}</h1>

      <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100">
        {news.cover_image_url ? (
          <Image src={news.cover_image_url} alt={news.title} fill className="object-cover" sizes="768px" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-12 w-12" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="prose prose-slate mt-8 max-w-none whitespace-pre-line text-slate-700">{news.content}</div>

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
