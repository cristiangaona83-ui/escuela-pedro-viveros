import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { StudentForm } from "@/features/students/StudentForm";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nuevo estudiante" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export default async function NuevoEstudiantePage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/estudiantes");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo estudiante</h1>
      <Card className="mt-6">
        <CardBody>
          <StudentForm />
        </CardBody>
      </Card>
    </div>
  );
}
