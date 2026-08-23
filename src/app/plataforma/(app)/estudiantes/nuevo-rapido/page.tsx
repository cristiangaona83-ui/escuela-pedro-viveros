import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { QuickCreateStudentForm } from "@/features/students/QuickCreateStudentForm";
import { listAcademicYears } from "@/services/courses";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nuevo estudiante" };

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

export default async function NuevoEstudianteRapidoPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/estudiantes");

  const [years, courses] = await Promise.all([listAcademicYears(), getTeachableCourses()]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo estudiante</h1>
      <p className="mt-1 text-sm text-slate-500">Crea la ficha y la matrícula activa en un solo paso.</p>
      <Card className="mt-6">
        <CardBody>
          <QuickCreateStudentForm years={years} courses={courses} />
        </CardBody>
      </Card>
    </div>
  );
}
