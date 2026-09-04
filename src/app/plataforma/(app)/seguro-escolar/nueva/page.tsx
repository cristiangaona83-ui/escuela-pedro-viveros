import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldAlert } from "lucide-react";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { resolveStudentForDeclaration } from "@/services/seguro-escolar";
import { StudentSearchGate } from "@/features/seguro-escolar/StudentSearchGate";
import { NewDeclarationForm } from "@/features/seguro-escolar/NewDeclarationForm";

export const metadata: Metadata = { title: "Nueva Declaración — Seguro Escolar" };

const MANAGE_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function NuevaDeclaracionPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const session = await getSessionContext();
  const allowed = canWrite(session?.roles ?? [], [...MANAGE_ROLES]);

  if (!allowed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Seguro Escolar</h1>
        <div className="mt-6">
          <EmptyState icon={ShieldAlert} title="Sin acceso" description="No tienes permiso para registrar declaraciones de accidente escolar." />
        </div>
      </div>
    );
  }

  const student = studentId ? await resolveStudentForDeclaration(studentId) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/plataforma/seguro-escolar" className="text-xs font-medium text-brand-700 hover:underline">
        ← Seguro Escolar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nueva Declaración de Accidente Escolar</h1>
      <p className="mt-1 text-sm text-slate-500">Formulario 0374-3 — Declaración Individual de Accidente Escolar.</p>

      <div className="mt-6">
        {!studentId ? (
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Buscar estudiante</h2>
              <StudentSearchGate />
            </CardBody>
          </Card>
        ) : student ? (
          <NewDeclarationForm student={student} userId={session!.userId} />
        ) : (
          <EmptyState icon={ShieldAlert} title="Estudiante no encontrado" description="Vuelve a intentar la búsqueda." />
        )}
      </div>
    </div>
  );
}
