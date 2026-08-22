import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { StudentForm } from "@/features/students/StudentForm";
import { getStudent } from "@/services/students";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Ficha del estudiante" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export default async function EstudianteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [student, session] = await Promise.all([getStudent(id), getSessionContext()]);
  if (!student) notFound();
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {student.last_names}, {student.first_names}
        </h1>
        <Badge tone={student.status === "matriculado" ? "success" : student.status === "retirado" ? "danger" : "neutral"}>
          {student.status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        RUN {student.run} · Registrado el {formatDate(student.created_at)}
      </p>

      <Card className="mt-6">
        <CardBody>
          <StudentForm student={student} canWrite={allowedToWrite} />
        </CardBody>
      </Card>
    </div>
  );
}
