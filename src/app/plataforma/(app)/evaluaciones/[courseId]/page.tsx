import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ClipboardList } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTeachableCourseSubjects } from "@/services/academic-scope";
import { listEvaluationScopeCounts } from "@/services/evaluations";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Evaluaciones del curso" };

const ACCESS_ROLES = ["director", "utp", "docente", "superadmin"] as const;

export default async function EvaluacionesCursoPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await getSessionContext();
  const allowed = canWrite(session?.roles ?? [], [...ACCESS_ROLES]);

  if (!allowed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Evaluaciones</h1>
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title="Sin acceso" description="No tienes permiso para ver las evaluaciones." />
        </div>
      </div>
    );
  }

  const options = await getTeachableCourseSubjects();
  const subjects = options.filter((o) => o.course_id === courseId);

  if (subjects.length === 0) {
    return (
      <div>
        <Link href="/plataforma/evaluaciones" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Evaluaciones
        </Link>
        <div className="mt-6">
          <EmptyState icon={BookOpen} title="Curso no disponible" description="No tienes asignaturas asignadas en este curso." />
        </div>
      </div>
    );
  }

  const courseLabel = subjects[0].course_label;
  const counts = await listEvaluationScopeCounts(courseId);
  const evalCountBySubject = new Map<string, number>();
  for (const e of counts) {
    evalCountBySubject.set(e.subject_id, (evalCountBySubject.get(e.subject_id) ?? 0) + 1);
  }

  return (
    <div>
      <Link href="/plataforma/evaluaciones" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Evaluaciones
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{courseLabel}</h1>
      <p className="mt-1 text-sm text-slate-500">Selecciona una asignatura para ver sus evaluaciones.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <Link key={s.subject_id} href={`/plataforma/evaluaciones/${courseId}/${s.subject_id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-900">{s.subject_name}</span>
                <p className="text-xs text-slate-500">
                  {evalCountBySubject.get(s.subject_id) ?? 0} evaluacion{(evalCountBySubject.get(s.subject_id) ?? 0) === 1 ? "" : "es"}
                </p>
                <span className="text-[11px] font-medium text-brand-700">Ver evaluaciones</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
