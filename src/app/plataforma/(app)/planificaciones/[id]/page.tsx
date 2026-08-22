import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { LessonPlanForm } from "@/features/planning/LessonPlanForm";
import { ReviewPanel } from "@/features/planning/ReviewPanel";
import { getLessonPlan } from "@/services/lesson-plans";
import { getTeachableCourseSubjects } from "@/services/academic-scope";
import { listLearningObjectives } from "@/services/learning-objectives";
import { listTeachers } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Planificación" };

const MANAGEMENT_ROLES = ["director", "utp", "superadmin"] as const;
const EDITABLE_STATUSES = ["borrador", "enviada", "observada"];

const STATUS_TONE = { borrador: "neutral", enviada: "brand", revisada: "warning", aprobada: "success", observada: "danger" } as const;
const STATUS_LABEL = { borrador: "Borrador", enviada: "Enviada", revisada: "Revisada", aprobada: "Aprobada", observada: "Observada" } as const;

export default async function PlanificacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, session] = await Promise.all([getLessonPlan(id), getSessionContext()]);
  if (!plan || !session) notFound();

  const isManagement = canWrite(session.roles, [...MANAGEMENT_ROLES]);
  const isOwner = plan.teacher_id === session.userId;
  const canEditContent = isManagement || (isOwner && EDITABLE_STATUSES.includes(plan.status));

  const [courseSubjectOptions, objectives, teacherRows] = canEditContent
    ? await Promise.all([
        getTeachableCourseSubjects(),
        listLearningObjectives({ activeOnly: true }),
        isManagement ? listTeachers() : Promise.resolve([]),
      ])
    : [[], [], []];

  const teacherOptions = isManagement
    ? teacherRows
        .map((r) => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
        .filter((p): p is { id: string; full_name: string } => Boolean(p))
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{plan.unit}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {plan.courses ? `${plan.courses.level} ${plan.courses.letter}` : "—"} · {plan.subjects?.name} · {plan.teacher?.full_name}
            {plan.plan_date && ` · ${formatDate(plan.plan_date)}`}
          </p>
        </div>
        <Badge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
      </div>

      {plan.reviewer_comment && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Comentario de {plan.reviewer?.full_name ?? "revisión"}
            </p>
            <p className="mt-1 text-sm text-amber-900">{plan.reviewer_comment}</p>
          </CardBody>
        </Card>
      )}

      {isManagement && (
        <Card className="mt-6">
          <CardBody>
            <h2 className="font-semibold text-slate-900">Revisión</h2>
            <div className="mt-4">
              <ReviewPanel
                planId={plan.id}
                unit={plan.unit}
                currentComment={plan.reviewer_comment}
                reviewerId={session.userId}
              />
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mt-6">
        <CardBody>
          {canEditContent ? (
            <LessonPlanForm
              plan={plan}
              courseSubjectOptions={courseSubjectOptions}
              objectives={objectives}
              teacherOptions={teacherOptions}
              currentUserId={session.userId}
            />
          ) : (
            <dl className="space-y-4 text-sm">
              {plan.objective && (
                <div><dt className="font-medium text-slate-700">Objetivo de la clase</dt><dd className="mt-1 text-slate-600">{plan.objective}</dd></div>
              )}
              {plan.lesson_plan_objectives.length > 0 && (
                <div>
                  <dt className="font-medium text-slate-700">OA asociados</dt>
                  <dd className="mt-1 space-y-1 text-slate-600">
                    {plan.lesson_plan_objectives.map((o) => (
                      <p key={o.learning_objective_id}>
                        <span className="font-medium">{o.learning_objectives?.code}</span> — {o.learning_objectives?.description}
                      </p>
                    ))}
                  </dd>
                </div>
              )}
              {plan.activities && (
                <div><dt className="font-medium text-slate-700">Actividades</dt><dd className="mt-1 text-slate-600">{plan.activities}</dd></div>
              )}
              {plan.evaluation_desc && (
                <div><dt className="font-medium text-slate-700">Evaluación</dt><dd className="mt-1 text-slate-600">{plan.evaluation_desc}</dd></div>
              )}
              {plan.resources && (
                <div><dt className="font-medium text-slate-700">Recursos</dt><dd className="mt-1 text-slate-600">{plan.resources}</dd></div>
              )}
              {plan.observations && (
                <div><dt className="font-medium text-slate-700">Observaciones</dt><dd className="mt-1 text-slate-600">{plan.observations}</dd></div>
              )}
            </dl>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
