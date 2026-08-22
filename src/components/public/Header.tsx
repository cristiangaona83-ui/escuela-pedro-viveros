"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { PUBLIC_NAV } from "@/config/navigation";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/ui/SchoolLogo";

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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <SchoolLogo size={42} />
          <span className="hidden font-heading leading-tight text-brand-900 sm:block">
            <span className="block text-[0.95rem] font-medium tracking-tight">Escuela Profesor</span>
            <span className="block text-[0.95rem] font-medium tracking-tight">Pedro Viveros Ormeño</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-3.5 py-2 text-[0.9rem] font-medium text-slate-600 transition-colors hover:text-brand-800",
                pathname === item.href && "text-brand-800"
              )}
            >
              {item.label}
              {pathname === item.href && (
                <span className="absolute inset-x-3.5 -bottom-[1px] h-[2px] rounded-full bg-brand-600" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={SITE.domains.platform}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900"
          >
            Plataforma Pedagógica
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 xl:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-20 bottom-0 z-40 overflow-y-auto bg-white xl:hidden">
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
