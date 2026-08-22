import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seguimiento Pedagógico" };

export default async function SeguimientoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_support")
    .select("*, students(first_names, last_names)")
    .order("event_date", { ascending: false })
    .limit(30);

  return (
    <ModuleStub
      icon={Activity}
      title="Seguimiento Pedagógico"
      description="Dificultades, fortalezas, acciones y responsables por estudiante, con seguimiento en el tiempo."
    >
      {data && data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.map((r) => {
            const row = r as unknown as { id: string; status: string; difficulty: string | null; event_date: string; students: { first_names: string; last_names: string } | null };
            return (
              <li key={row.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-800">{row.students ? `${row.students.last_names}, ${row.students.first_names}` : "—"}</p>
                  <p className="text-xs text-slate-500">{row.difficulty} · {formatDate(row.event_date)}</p>
                </div>
                <Badge tone={row.status === "resuelto" ? "success" : "warning"}>{row.status}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </ModuleStub>
  );
}
