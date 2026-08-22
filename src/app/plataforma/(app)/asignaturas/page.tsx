import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { SubjectForm } from "@/features/subjects/SubjectForm";

export const metadata: Metadata = { title: "Asignaturas" };

export default async function AsignaturasPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("*").order("name", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Asignaturas</h1>
      <p className="mt-1 text-sm text-slate-500">Catálogo configurable de asignaturas del establecimiento.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardBody>
            {subjects && subjects.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-slate-800">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{s.code}</Badge>
                      <Badge tone={s.active ? "success" : "danger"}>{s.active ? "Activa" : "Inactiva"}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={BookOpen} title="Sin asignaturas" description="Agrega la primera asignatura del plan de estudios." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Nueva asignatura</h2>
            <div className="mt-4">
              <SubjectForm />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
