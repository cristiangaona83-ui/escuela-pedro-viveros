import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { ObservationForm } from "@/features/observations/ObservationForm";
import { getObservation } from "@/services/classroom-observations";
import { listTeachers, listCourseOptions } from "@/services/courses";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar observación" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarAcompanamientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/acompanamiento");

  const [observation, teacherRows, courseOptions, subjectOptions] = await Promise.all([
    getObservation(id),
    listTeachers(),
    listCourseOptions(),
    listSubjectOptions(),
  ]);

  if (!observation) notFound();

  const teacherOptions = teacherRows
    .map((r) => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar observación</h1>
      <Card className="mt-6">
        <CardBody>
          <ObservationForm
            observation={observation}
            teacherOptions={teacherOptions}
            courseOptions={courseOptions}
            subjectOptions={subjectOptions}
            currentUserId={session!.userId}
          />
        </CardBody>
      </Card>
    </div>
  );
}
