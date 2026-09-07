import type { Metadata } from "next";
import Link from "next/link";
import { Folder, ClipboardList } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTeachableCourseSubjects } from "@/services/academic-scope";
import { listEvaluationScopeCounts } from "@/services/evaluations";
import { levelSortIndex } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Evaluaciones" };

const ACCESS_ROLES = ["director", "utp", "docente", "superadmin"] as const;

export default async function EvaluacionesPage() {
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

  const courseMap = new Map<string, { courseId: string; courseLabel: string; courseLevel: string; subjectIds: Set<string> }>();
  for (const o of options) {
    const entry = courseMap.get(o.course_id) ?? { courseId: o.course_id, courseLabel: o.course_label, courseLevel: o.course_level, subjectIds: new Set<string>() };
    entry.subjectIds.add(o.subject_id);
    courseMap.set(o.course_id, entry);
  }
  const courseIds = Array.from(courseMap.keys());
  const evalCounts = courseIds.length > 0 ? await listEvaluationScopeCounts() : [];
  const evalCountByCourse = new Map<string, number>();
  for (const e of evalCounts) {
    if (!courseMap.has(e.course_id)) continue;
    evalCountByCourse.set(e.course_id, (evalCountByCourse.get(e.course_id) ?? 0) + 1);
  }

  const courses = Array.from(courseMap.values()).sort(
    (a, b) => levelSortIndex(a.courseLevel) - levelSortIndex(b.courseLevel) || a.courseLabel.localeCompare(b.courseLabel, "es")
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Evaluaciones</h1>
      <p className="mt-1 text-sm text-slate-500">Selecciona un curso para ver y administrar sus evaluaciones por asignatura.</p>

      <div className="mt-6">
        {courses.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Sin cursos asignados"
            description="No tienes cursos y asignaturas asignados todavía."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {courses.map((c) => (
              <Link key={c.courseId} href={`/plataforma/evaluaciones/${c.courseId}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody className="flex flex-col items-center gap-1 py-4 text-center">
                    <Folder className="h-6 w-6 text-brand-600" strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-slate-900">{c.courseLabel}</span>
                    <span className="text-[11px] text-slate-500">
                      {c.subjectIds.size} asignatura{c.subjectIds.size === 1 ? "" : "s"}
                    </span>
                    <span className="text-[11px] font-medium text-brand-700">
                      {evalCountByCourse.get(c.courseId) ?? 0} evaluacion{(evalCountByCourse.get(c.courseId) ?? 0) === 1 ? "" : "es"}
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
