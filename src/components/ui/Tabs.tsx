import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
}

/**
 * Pestañas por URL (query param, no estado de cliente) -- mismo patrón que
 * `StudentTabsNav` (src/features/students/StudentTabsNav.tsx), generalizado
 * para reutilizar en cualquier página con pestañas. Al ser un enlace real,
 * la página server-side puede leer `searchParams` y hacer fetch condicional
 * solo de la pestaña activa (evita cargar datos de pestañas no visitadas).
 */
export function Tabs({
  basePath,
  paramName = "tab",
  tabs,
  active,
  extraParams,
}: {
  basePath: string;
  /** Nombre del query param que identifica la pestaña activa. */
  paramName?: string;
  tabs: TabItem[];
  active: string;
  /** Otros query params a preservar en cada enlace (ej. año/período seleccionados). */
  extraParams?: Record<string, string | undefined>;
}) {
  const buildHref = (key: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams ?? {})) if (v) params.set(k, v);
    params.set(paramName, key);
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={buildHref(t.key)}
            className={cn(
              "shrink-0 rounded-t-lg px-3.5 py-2 text-sm font-medium",
              active === t.key ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
