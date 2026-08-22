import type { Metadata } from "next";
import { FileEdit } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planificaciones" };

const STATUS_TONE = { borrador: "neutral", enviada: "brand", revisada: "warning", aprobada: "success", observada: "danger" } as const;

export default async function PlanificacionesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_plans")
    .select("*, courses(level, letter), subjects(name), profiles!lesson_plans_teacher_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <ModuleStub
      icon={FileEdit}
      title="Planificaciones"
      description="Unidades, objetivos, actividades y estado de revisión por parte de UTP: borrador, enviada, revisada, aprobada u observada."
    >
      {data && data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.map((p) => {
            const row = p as unknown as {
              id: string; unit: string; status: keyof typeof STATUS_TONE;
              courses: { level: string; letter: string } | null; subjects: { name: string } | null;
              profiles: { full_name: string } | null;
            };
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{row.unit}</p>
                  <p className="text-xs text-slate-500">
                    {row.courses ? `${row.courses.level} ${row.courses.letter}` : "—"} · {row.subjects?.name} · {row.profiles?.full_name}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </ModuleStub>
  );
}
