import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/Card";
import { CourseForm } from "@/features/courses/CourseForm";
import { listAcademicYears } from "@/services/courses";

export const metadata: Metadata = { title: "Nuevo curso" };

export default async function NuevoCursoPage() {
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
