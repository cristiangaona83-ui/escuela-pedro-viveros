import type { Metadata } from "next";
import { Eye } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acompañamiento al Aula" };

export default async function AcompanamientoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classroom_observations")
    .select("*, courses(level, letter), profiles!classroom_observations_teacher_id_fkey(full_name)")
    .order("obs_date", { ascending: false })
    .limit(30);

  return (
    <ModuleStub
      icon={Eye}
      title="Acompañamiento al Aula"
      description="Observaciones de Dirección y UTP: foco, fortalezas, oportunidades de mejora y acuerdos con cada docente."
    >
      {data && data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.map((r) => {
            const row = r as unknown as { id: string; obs_date: string; focus: string | null; courses: { level: string; letter: string } | null; profiles: { full_name: string } | null };
            return (
              <li key={row.id} className="py-3">
                <p className="text-sm font-medium text-slate-800">{row.profiles?.full_name} — {row.courses ? `${row.courses.level} ${row.courses.letter}` : "—"}</p>
                <p className="text-xs text-slate-500">{row.focus} · {formatDate(row.obs_date)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </ModuleStub>
  );
}
