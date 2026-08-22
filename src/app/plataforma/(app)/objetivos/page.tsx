import type { Metadata } from "next";
import Link from "next/link";
import { Target, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { ObjectiveForm } from "@/features/objectives/ObjectiveForm";
import { ToggleObjectiveActiveButton } from "@/features/objectives/ToggleObjectiveActiveButton";
import { listLearningObjectives } from "@/services/learning-objectives";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Objetivos de Aprendizaje" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function ObjetivosPage({
  searchParams,
}: {
  searchParams: Promise<{ asignatura?: string }>;
}) {
  const { asignatura } = await searchParams;
  const [objectives, subjectOptions, session] = await Promise.all([
    listLearningObjectives({ subjectId: asignatura }),
    listSubjectOptions(),
    getSessionContext(),
  ]);

  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Objetivos de Aprendizaje</h1>
      <p className="mt-1 text-sm text-slate-500">
        Catálogo de OA por asignatura y nivel. Sirve de base para las Planificaciones — carga aquí solo objetivos ya validados oficialmente.
      </p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_380px]" : ""}`}>
        <Card>
          <CardBody>
            <form className="mb-4 flex max-w-sm items-end gap-2">
              <div className="flex-1">
                <Select name="asignatura" defaultValue={asignatura ?? ""}>
                  <option value="">Todas las asignaturas</option>
                  {subjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Filtrar
              </button>
            </form>

            {objectives.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {objectives.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{o.code}</p>
                        <Badge tone="neutral">{o.subjects?.name}</Badge>
                        <Badge tone="brand">{o.level}</Badge>
                        {!o.active && <Badge tone="danger">Inactivo</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{o.description}</p>
                    </div>
                    {allowedToWrite && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          href={`/plataforma/objetivos/${o.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Editar ${o.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <ToggleObjectiveActiveButton objectiveId={o.id} active={o.active} code={o.code} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Target} title="Sin objetivos cargados" description="Agrega el primer OA validado del catálogo." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nuevo objetivo</h2>
              <div className="mt-4">
                <ObjectiveForm subjectOptions={subjectOptions} />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
