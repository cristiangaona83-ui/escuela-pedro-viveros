import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { LessonPlanForm } from "@/features/planning/LessonPlanForm";
import { getTeachableCourseSubjects } from "@/services/academic-scope";
import { listLearningObjectives } from "@/services/learning-objectives";
import { listTeachers } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nueva planificación" };

const WRITE_ROLES = ["director", "utp", "docente", "superadmin"] as const;
const MANAGEMENT_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NuevaPlanificacionPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/planificaciones");

  const isManagement = canWrite(session?.roles ?? [], [...MANAGEMENT_ROLES]);
  const [courseSubjectOptions, objectives, teacherRows] = await Promise.all([
    getTeachableCourseSubjects(),
    listLearningObjectives({ activeOnly: true }),
    isManagement ? listTeachers() : Promise.resolve([]),
  ]);

  const teacherOptions = isManagement
    ? teacherRows
        .map((r) => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
        .filter((p): p is { id: string; full_name: string } => Boolean(p))
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nueva planificación</h1>
      <Card className="mt-6">
        <CardBody>
          <LessonPlanForm
            courseSubjectOptions={courseSubjectOptions}
            objectives={objectives}
            teacherOptions={teacherOptions}
            currentUserId={session!.userId}
          />
        </CardBody>
      </Card>
    </div>
  );
}
