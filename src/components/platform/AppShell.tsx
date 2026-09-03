"use client";

import { useState } from "react";
import { Menu, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/platform/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/features/auth/role-labels";
import { ToastProvider } from "@/components/ui/Toast";
import type { RoleCode } from "@/types/database";

export function AppShell({
  roles,
  userName,
  children,
}: {
  roles: RoleCode[];
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/plataforma/login");
    router.refresh();
  }

  return (
    <ToastProvider>
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar roles={roles} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-100 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{userName}</p>
              <p className="text-xs text-slate-500">{roles.map((r) => ROLE_LABELS[r]).join(" · ") || "Sin rol asignado"}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <UserRound className="h-4 w-4" />
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
