"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Resumen", href: "/plataforma/convivencia" },
  { label: "Casos", href: "/plataforma/convivencia/casos" },
  { label: "Situaciones", href: "/plataforma/convivencia/situaciones" },
  { label: "Seguimientos", href: "/plataforma/convivencia/seguimientos" },
  { label: "Entrevistas", href: "/plataforma/convivencia/entrevistas" },
  { label: "Acciones preventivas", href: "/plataforma/convivencia/preventivas" },
  { label: "Plan de Gestión", href: "/plataforma/convivencia/plan-gestion" },
  { label: "Protocolos", href: "/plataforma/convivencia/protocolos" },
  { label: "Reportes", href: "/plataforma/convivencia/reportes" },
];

export function ConvivenciaNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {ITEMS.map((item) => {
        const active = item.href === "/plataforma/convivencia" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
