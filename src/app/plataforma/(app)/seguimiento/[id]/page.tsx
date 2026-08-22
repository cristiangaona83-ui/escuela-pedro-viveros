import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { SupportForm } from "@/features/pedagogical-support/SupportForm";
import { getSupportRecord } from "@/services/pedagogical-support";
import { listStudents } from "@/services/students";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar seguimiento" };

const WRITE_ROLES = ["director", "utp", "docente", "convivencia", "superadmin"] as const;

export default async function EditarSeguimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [record, students, subjectOptions, session] = await Promise.all([
    getSupportRecord(id),
    listStudents(),
    listSubjectOptions(),
    getSessionContext(),
  ]);

  if (!record) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/seguimiento");

  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.last_names}, ${s.first_names}${s.course_label ? ` — ${s.course_label}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar seguimiento</h1>
      <Card className="mt-6">
        <CardBody>
          <SupportForm record={record} studentOptions={studentOptions} subjectOptions={subjectOptions} currentUserId={session!.userId} />
        </CardBody>
      </Card>
    </div>
  );
}
