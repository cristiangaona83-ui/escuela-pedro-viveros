"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { PUBLIC_NAV } from "@/config/navigation";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/ui/SchoolLogo";

const NAV_LINE_BREAKS: Record<string, [string, string]> = {
  "Nuestra Escuela": ["Nuestra", "Escuela"],
  "Proyecto Educativo": ["Proyecto", "Educativo"],
  "Equipo Directivo": ["Equipo", "Directivo"],
  "Equipo PIE": ["Equipo", "PIE"],
  "Docentes y Asistentes": ["Docentes y", "Asistentes"],
  "Asistentes de la Educación": ["Asistentes de la", "Educación"],
};

function NavLabel({ label }: { label: string }) {
  const lines = NAV_LINE_BREAKS[label];
  if (!lines) return <>{label}</>;
  return (
    <>
      {lines[0].split(/\s+/).join(String.fromCharCode(160))}
      <br />
      {lines[1]}
    </>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white">
      <div className="mx-auto grid h-24 max-w-[1800px] grid-cols-[auto_1fr_auto] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <SchoolLogo size={38} />
          <span className="hidden whitespace-nowrap text-[0.95rem] font-semibold leading-tight tracking-tight text-brand-900 sm:block">
            Escuela Pedro
            <br />
            Viveros Ormeño
          </span>
        </Link>

        <nav className="hidden items-center justify-center min-[1180px]:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center px-1.5 py-2 text-center text-[15px] font-semibold leading-[1.2] text-slate-700 transition-colors hover:text-brand-800",
                pathname === item.href && "text-brand-800"
              )}
            >
              <NavLabel label={item.label} />
              {pathname === item.href && (
                <span className="absolute inset-x-1.5 -bottom-[1px] h-[2px] rounded-full bg-brand-600" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-self-end gap-3">
          <a
            href={SITE.domains.platform}
            className="hidden items-center gap-1.5 rounded-lg bg-brand-800 px-3 py-2.5 text-[0.82rem] font-medium text-white transition-colors hover:bg-brand-900 lg:inline-flex"
          >
            Plataforma Pedagógica
            <ArrowUpRight className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="min-[1180px]:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-24 bottom-0 z-40 overflow-y-auto bg-white min-[1180px]:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50",
                  pathname === item.href && "bg-brand-50 text-brand-800"
                )}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={SITE.domains.platform}
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-800 px-4 py-3.5 text-base font-medium text-white"
            >
              Plataforma Pedagógica
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
