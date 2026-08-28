"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CaseTab {
  key: string;
  label: string;
  content: ReactNode;
}

/** Selector de pestañas genérico para la ficha del caso — cada pestaña ya
 * trae su contenido resuelto desde el servidor; esto solo alterna cuál se
 * muestra, sin llamadas adicionales. */
export function CaseTabs({ tabs }: { tabs: CaseTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <div className="relative">
        <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active === tab.key ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Aviso visual de que hay más pestañas fuera de vista -- el scroll
            horizontal sin esto es fácil de no notar y deja pestañas (como
            "Actas y documentos") efectivamente escondidas. */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
      </div>
      <div className="mt-4">{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
