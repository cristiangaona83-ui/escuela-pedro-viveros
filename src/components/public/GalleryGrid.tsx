"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { GalleryRow } from "@/types/database";

export function GalleryGrid({ items }: { items: GalleryRow[] }) {
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["Todas", ...Array.from(set)];
  }, [items]);

  const [category, setCategory] = useState("Todas");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtered = category === "Todas" ? items : items.filter((i) => i.category === category);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              category === cat ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
          >
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(min-width:1024px) 25vw, 50vw"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && filtered[activeIndex] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => setActiveIndex((v) => (v !== null ? v - 1 : v))}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {activeIndex < filtered.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveIndex((v) => (v !== null ? v + 1 : v))}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="max-h-[85vh] max-w-3xl">
            <div className="relative aspect-[4/3] w-full max-h-[70vh]">
              <Image
                src={filtered[activeIndex].image_url}
                alt={filtered[activeIndex].title}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
            <p className="mt-3 text-center text-sm text-white/80">
              {filtered[activeIndex].title}
              {filtered[activeIndex].event_date && ` — ${formatDate(filtered[activeIndex].event_date)}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
