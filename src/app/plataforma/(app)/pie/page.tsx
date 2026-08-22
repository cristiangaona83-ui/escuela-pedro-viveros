import type { Metadata } from "next";
import { HeartHandshake, ShieldAlert } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "PIE" };

export default async function PiePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pie_records")
    .select("*, students(first_names, last_names)")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Módulo de acceso estrictamente restringido a Equipo PIE, UTP y Dirección. La información nunca se expone públicamente.
      </div>
      <ModuleStub
        icon={HeartHandshake}
        title="Programa de Integración Escolar"
        description="Estudiantes asociados, profesionales responsables, apoyos y seguimiento individual."
      >
        {data && data.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {data.map((r) => {
              const row = r as unknown as { id: string; status: string; support_type: string | null; students: { first_names: string; last_names: string } | null };
              return (
                <li key={row.id} className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-800">{row.students ? `${row.students.last_names}, ${row.students.first_names}` : "—"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{row.support_type}</span>
                    <Badge tone={row.status === "activo" ? "success" : "neutral"}>{row.status}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ModuleStub>
    </div>
  );
}
