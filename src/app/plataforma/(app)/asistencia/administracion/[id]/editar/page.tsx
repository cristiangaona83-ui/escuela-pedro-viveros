import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getSuspension, listSuspensionCourseOptions, listActiveSuspensionsForRecoveryLink } from "@/services/class-suspensions";
import { SuspensionForm } from "@/features/attendance-reports/SuspensionForm";

export const metadata: Metadata = { title: "Editar suspensión — Asistencia" };

const ADMIN_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function EditarSuspensionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ADMIN_ROLES])) redirect("/plataforma/asistencia/administracion");

  const [existing, courses, recoveryOptions] = await Promise.all([
    getSuspension(id),
    listSuspensionCourseOptions(),
    listActiveSuspensionsForRecoveryLink(),
  ]);
  if (!existing) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/plataforma/asistencia/administracion" className="text-xs font-medium text-brand-700 hover:underline">
        ← Administrar calendario
      </Link>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Editar suspensión</h2>
      <Card className="mt-4">
        <CardBody>
          <SuspensionForm courses={courses} recoveryOptions={recoveryOptions.filter((o) => o.id !== id)} existing={existing} />
        </CardBody>
      </Card>
    </div>
  );
}
