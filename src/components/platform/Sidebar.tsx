"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { PLATFORM_NAV, NAV_GROUP_LABELS, type PlatformNavGroup } from "@/config/navigation";
import { PLATFORM_NAME } from "@/config/site";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/ui/SchoolLogo";
import type { RoleCode } from "@/types/database";

const GROUP_ORDER: PlatformNavGroup[] = ["principal", "utp", "inspectoria", "convivencia", "pie", "general", "direccion"];

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
  const groups = GROUP_ORDER.map((group) => ({ group, items: items.filter((item) => item.group === group) })).filter(
    (g) => g.items.length > 0
  );

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <SchoolLogo size={36} />
        <span className="font-heading text-[0.95rem] font-medium leading-tight tracking-tight text-white">{PLATFORM_NAME}</span>
        <button type="button" onClick={onClose} className="ml-auto text-brand-300 lg:hidden" aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group}>
            {NAV_GROUP_LABELS[group] && (
              <p className="px-3 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wider text-brand-300/60">
                {NAV_GROUP_LABELS[group]}
              </p>
            )}
            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-[0.875rem] font-medium transition-colors",
                      active
                        ? "border-accent-400 bg-white/[0.06] text-white"
                        : "border-transparent text-brand-200/80 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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
