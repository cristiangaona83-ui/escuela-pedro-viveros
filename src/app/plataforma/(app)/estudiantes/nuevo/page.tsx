import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/Card";
import { StudentForm } from "@/features/students/StudentForm";

export const metadata: Metadata = { title: "Nuevo estudiante" };

export default function NuevoEstudiantePage() {
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
