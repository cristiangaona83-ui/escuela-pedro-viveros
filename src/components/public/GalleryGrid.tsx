"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Play, Camera, Video as VideoIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/video/youtube";
import type { GalleryRow } from "@/types/database";

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type MediaTab = "image" | "video";

/** "Videos" agrupa video subido y YouTube -- ambos son "un video" para
 * quien navega la galería, la distinción interna (media_type: video vs
 * youtube) sigue existiendo solo para saber cómo reproducirlo. */
function isVideoItem(item: GalleryRow): boolean {
  return item.media_type !== "image";
}

export function GalleryGrid({ items }: { items: GalleryRow[] }) {
  const [tab, setTab] = useState<MediaTab>("image");
  const [category, setCategory] = useState("Todas");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalPhotoCount = items.filter((i) => !isVideoItem(i)).length;
  const totalVideoCount = items.filter(isVideoItem).length;

  const byTab = items.filter((i) => (tab === "image" ? !isVideoItem(i) : isVideoItem(i)));

  const categories = useMemo(() => {
    const set = new Set(byTab.map((i) => i.category));
    return ["Todas", ...Array.from(set)];
  }, [byTab]);

  function selectTab(next: MediaTab) {
    setTab(next);
    setCategory("Todas");
    setActiveIndex(null);
  }

  const filtered = category === "Todas" ? byTab : byTab.filter((i) => i.category === category);
  const active = activeIndex !== null ? filtered[activeIndex] : null;

  return (
    <div>
      {/* Una sola sección Galería -- Imágenes/Videos son un selector interno
          (no rutas separadas), así que el contenido de abajo simplemente
          cambia de subconjunto sin navegar a ningún otro lado. */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de contenido">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "image"}
          onClick={() => selectTab("image")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
            tab === "image" ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Camera className="h-4 w-4" /> Imágenes
          <span className={cn("text-xs font-normal", tab === "image" ? "text-white/80" : "text-slate-400")}>({totalPhotoCount})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "video"}
          onClick={() => selectTab("video")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
            tab === "video" ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <VideoIcon className="h-4 w-4" /> Videos
          <span className={cn("text-xs font-normal", tab === "video" ? "text-white/80" : "text-slate-400")}>({totalVideoCount})</span>
        </button>
      </div>

      {categories.length > 2 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                category === cat ? "bg-brand-100 text-brand-800" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-slate-500">
        {filtered.length} {tab === "image" ? `fotografía${filtered.length === 1 ? "" : "s"}` : `video${filtered.length === 1 ? "" : "s"}`}
      </p>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">
          {tab === "image" ? "Aún no hay fotografías publicadas en esta categoría." : "Aún no hay videos publicados en esta categoría."}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item, i) => {
          const duration = formatDuration(item.duration_seconds);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className="group text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width:1024px) 25vw, 50vw"
                />
                {item.media_type !== "image" && (
                  <>
                    <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand-800 shadow-sm">
                        <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                      </span>
                    </span>
                    {duration && (
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">{duration}</span>
                    )}
                  </>
                )}
              </div>
              <p className="mt-1.5 truncate text-xs font-medium text-slate-600">{item.title}</p>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {activeIndex! > 0 && (
            <button
              type="button"
              onClick={() => setActiveIndex((v) => (v !== null ? v - 1 : v))}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {activeIndex! < filtered.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveIndex((v) => (v !== null ? v + 1 : v))}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="max-h-[85vh] w-full max-w-3xl">
            {active.media_type === "image" && (
              <div className="relative aspect-[4/3] max-h-[70vh] w-full">
                <Image src={active.image_url} alt={active.title} fill className="object-contain" sizes="90vw" />
              </div>
            )}

            {active.media_type === "video" && active.video_url && (
              <div className="aspect-video max-h-[70vh] w-full overflow-hidden rounded-lg bg-black">
                <video
                  key={active.id}
                  src={active.video_url}
                  poster={active.image_url}
                  controls
                  preload="metadata"
                  playsInline
                  className="h-full w-full object-contain"
                >
                  Tu navegador no puede reproducir este video.
                </video>
              </div>
            )}

            {active.media_type === "youtube" && active.youtube_id && (
              <div className="aspect-video max-h-[70vh] w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  key={active.id}
                  src={youtubeEmbedUrl(active.youtube_id)}
                  title={active.title}
                  className="h-full w-full"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <div className="mt-3 text-center">
              <p className="text-sm font-medium text-white">
                {active.title}
                {active.event_date && ` — ${formatDate(active.event_date)}`}
              </p>
              {active.description && <p className="mx-auto mt-1 max-w-xl text-xs text-white/70">{active.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
