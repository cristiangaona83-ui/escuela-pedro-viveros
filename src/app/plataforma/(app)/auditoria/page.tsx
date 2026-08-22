import type { Metadata } from "next";
import { History } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bitácora de acciones" };

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ModuleStub
      icon={History}
      title="Bitácora de acciones"
      description="Registro de cambios de notas, certificados emitidos, cambios de roles, cierres de período y eliminaciones. Solo visible para Dirección y Superadministrador."
    >
      {data && data.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="py-2 pr-4">Fecha</th><th className="py-2 pr-4">Usuario</th><th className="py-2 pr-4">Acción</th><th className="py-2">Módulo</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((log) => {
              const row = log as unknown as { id: string; created_at: string; action: string; module: string; profiles: { full_name: string } | null };
              return (
                <tr key={row.id}>
                  <td className="py-2.5 pr-4 text-slate-500">{formatDate(row.created_at, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2.5 pr-4 text-slate-800">{row.profiles?.full_name ?? "Sistema"}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{row.action}</td>
                  <td className="py-2.5 text-slate-500">{row.module}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </ModuleStub>
  );
}
