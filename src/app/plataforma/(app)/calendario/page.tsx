import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").order("start_at", { ascending: true }).limit(30);

  return (
    <ModuleStub
      icon={Calendar}
      title="Calendario Institucional"
      description="Reuniones, evaluaciones, actividades, salidas educativas, consejos de profesores y cierres de semestre."
    >
      {data && data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.map((e) => (
            <li key={e.id} className="py-3">
              <p className="text-sm font-medium text-slate-800">{e.title}</p>
              <p className="text-xs text-slate-500">{formatDate(e.start_at, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </li>
          ))}
        </ul>
      )}
    </ModuleStub>
  );
}
