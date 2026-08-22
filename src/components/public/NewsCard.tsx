import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { NewsRow } from "@/types/database";

export function NewsCard({ news }: { news: NewsRow }) {
  return (
    <Link
      href={`/noticias/${news.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-brand-200"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {news.cover_image_url ? (
          <Image
            src={news.cover_image_url}
            alt={news.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{news.category}</Badge>
          <span className="text-xs text-slate-400">{formatDate(news.published_at)}</span>
        </div>
        <h3 className="text-base font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
          {news.title}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-500">{news.summary}</p>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-700">
          Leer más <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
