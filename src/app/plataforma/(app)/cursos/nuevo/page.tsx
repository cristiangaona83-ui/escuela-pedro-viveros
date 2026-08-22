import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { CourseForm } from "@/features/courses/CourseForm";
import { listAcademicYears } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nuevo curso" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NuevoCursoPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/cursos");

  const years = await listAcademicYears();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo curso</h1>
      <Card className="mt-6">
        <CardBody>
          <CourseForm academicYears={years} />
        </CardBody>
      </Card>
    </div>
  );
}
