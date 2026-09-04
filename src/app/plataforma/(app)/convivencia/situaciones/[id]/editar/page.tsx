import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SituationForm } from "@/features/convivencia/SituationForm";
import { getSituation, listCaseTypes } from "@/services/convivencia";
import { listActiveStudents } from "@/services/certificates";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

const CASE_WRITE_ROLES = ["director", "superadmin", "convivencia"] as const;

export const metadata: Metadata = { title: "Editar situación — Convivencia Educativa" };

export default async function EditarSituacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...CASE_WRITE_ROLES])) {
    return (
      <div>
        <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para editar situaciones." />
      </div>
    );
  }

  const [situation, caseTypes, students] = await Promise.all([getSituation(id), listCaseTypes(), listActiveStudents()]);
  if (!situation) notFound();
  if (situation.status === "archivado") redirect(`/plataforma/convivencia/situaciones/${id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/plataforma/convivencia/situaciones/${id}`} className="text-xs font-medium text-brand-700 hover:underline">
        ← Volver a la situación
      </Link>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Editar situación</h2>
      <p className="mt-1 text-sm text-slate-500">Corrige los datos registrados. No se puede reemplazar el acta adjunta desde aquí.</p>
      <Card className="mt-4">
        <CardBody>
          <SituationForm caseTypes={caseTypes} students={students} situation={situation} />
        </CardBody>
      </Card>
    </div>
  );
}
