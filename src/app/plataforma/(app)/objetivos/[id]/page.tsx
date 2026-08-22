import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { ObjectiveForm } from "@/features/objectives/ObjectiveForm";
import { getLearningObjective } from "@/services/learning-objectives";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar objetivo" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarObjetivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [objective, subjectOptions, session] = await Promise.all([
    getLearningObjective(id),
    listSubjectOptions(),
    getSessionContext(),
  ]);

  if (!objective) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/objetivos");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar objetivo de aprendizaje</h1>
      <Card className="mt-6">
        <CardBody>
          <ObjectiveForm objective={objective} subjectOptions={subjectOptions} />
        </CardBody>
      </Card>
    </div>
  );
}
