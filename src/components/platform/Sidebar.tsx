"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { GraduationCap, X } from "lucide-react";
import { PLATFORM_NAV } from "@/config/navigation";
import { PLATFORM_NAME } from "@/config/site";
import { cn } from "@/lib/utils";
import type { RoleCode } from "@/types/database";

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Icon className={className} strokeWidth={1.75} />;
}

export function Sidebar({
  roles,
  open,
  onClose,
}: {
  roles: RoleCode[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = PLATFORM_NAV.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r as RoleCode)));

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold leading-tight text-white">{PLATFORM_NAME}</span>
        <button type="button" onClick={onClose} className="ml-auto text-brand-300 lg:hidden" aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-brand-200 hover:bg-white/5 hover:text-white"
              )}
            >
              <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-brand-950 lg:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-brand-950">{content}</aside>
        </div>
      )}
    </>
  );
}
