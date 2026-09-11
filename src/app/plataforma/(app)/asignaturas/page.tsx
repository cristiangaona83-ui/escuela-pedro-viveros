import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { SubjectForm } from "@/features/subjects/SubjectForm";
import { LinkedSubjectSelect } from "@/features/subjects/LinkedSubjectSelect";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import type { SubjectRow } from "@/types/database";

export const metadata: Metadata = { title: "Asignaturas" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function AsignaturasPage() {
  const supabase = await createClient();
  const [{ data: subjects }, session] = await Promise.all([
    supabase.from("subjects").select("*").order("name", { ascending: true }),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const rows: SubjectRow[] = subjects ?? [];
  const nameById = new Map(rows.map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Asignaturas</h1>
      <p className="mt-1 text-sm text-slate-500">Catálogo configurable de asignaturas del establecimiento.</p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <Card>
          <CardBody>
            {rows.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {rows.map((s) => {
                  const linkOptions = rows.filter((o) => o.id !== s.id).map((o) => ({ id: o.id, name: o.name }));
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{s.name}</span>
                        {s.linked_subject_id && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            Vinculada a {nameById.get(s.linked_subject_id) ?? "—"} · no cuenta en el promedio general
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{s.code}</Badge>
                        <Badge tone={s.active ? "success" : "danger"}>{s.active ? "Activa" : "Inactiva"}</Badge>
                        {allowedToWrite && (
                          <LinkedSubjectSelect subjectId={s.id} linkedSubjectId={s.linked_subject_id} options={linkOptions} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={BookOpen} title="Sin asignaturas" description="Agrega la primera asignatura del plan de estudios." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nueva asignatura</h2>
              <div className="mt-4">
                <SubjectForm linkableSubjects={rows.map((s) => ({ id: s.id, name: s.name }))} />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
