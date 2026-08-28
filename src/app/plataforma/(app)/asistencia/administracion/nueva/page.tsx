import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { listSuspensionCourseOptions, listActiveSuspensionsForRecoveryLink } from "@/services/class-suspensions";
import { SuspensionForm } from "@/features/attendance-reports/SuspensionForm";

export const metadata: Metadata = { title: "Registrar suspensión — Asistencia" };

const ADMIN_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function NuevaSuspensionPage() {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ADMIN_ROLES])) redirect("/plataforma/asistencia/administracion");

  const [courses, recoveryOptions] = await Promise.all([listSuspensionCourseOptions(), listActiveSuspensionsForRecoveryLink()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/plataforma/asistencia/administracion" className="text-xs font-medium text-brand-700 hover:underline">
        ← Administrar calendario
      </Link>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Registrar suspensión</h2>
      <p className="text-sm text-slate-500">Excluye automáticamente el día del cálculo de asistencia para los cursos afectados (jornada completa), o registra un día recuperado.</p>
      <Card className="mt-4">
        <CardBody>
          <SuspensionForm courses={courses} recoveryOptions={recoveryOptions} />
        </CardBody>
      </Card>
    </div>
  );
}
