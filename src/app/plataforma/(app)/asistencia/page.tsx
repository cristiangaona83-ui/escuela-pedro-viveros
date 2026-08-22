import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { ModuleStub } from "@/components/platform/ModuleStub";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Asistencia" };

const STATUS_TONE = { presente: "success", ausente: "danger", atraso: "warning", retiro: "neutral" } as const;

export default async function AsistenciaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("*, students(first_names, last_names), courses(level, letter)")
    .order("date", { ascending: false })
    .limit(30);

  return (
    <ModuleStub
      icon={CalendarCheck}
      title="Asistencia"
      description="Registro diario de presente, ausente, atraso y retiro por curso. El resumen mensual y el porcentaje de asistencia se calculan sobre estos registros."
    >
      {data && data.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="py-2 pr-4">Fecha</th><th className="py-2 pr-4">Estudiante</th><th className="py-2 pr-4">Curso</th><th className="py-2">Estado</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => {
              const row = r as unknown as {
                id: string; date: string; status: keyof typeof STATUS_TONE;
                students: { first_names: string; last_names: string } | null;
                courses: { level: string; letter: string } | null;
              };
              return (
                <tr key={row.id}>
                  <td className="py-2.5 pr-4 text-slate-500">{formatDate(row.date)}</td>
                  <td className="py-2.5 pr-4 text-slate-800">{row.students ? `${row.students.last_names}, ${row.students.first_names}` : "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{row.courses ? `${row.courses.level} ${row.courses.letter}` : "—"}</td>
                  <td className="py-2.5"><Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </ModuleStub>
  );
}
