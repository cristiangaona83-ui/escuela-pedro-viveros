import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/Card";
import { listEvaluations } from "@/services/evaluations";
import { listOpenPeriods, getTeachableCourseSubjects } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { EvaluationForm } from "@/features/evaluations/EvaluationForm";
import { EvaluationsAdminTable } from "@/features/evaluations/EvaluationsAdminTable";

export const metadata: Metadata = { title: "Evaluaciones" };

const WRITE_ROLES = ["director", "utp", "docente", "superadmin"] as const;

export default async function EvaluacionesPage() {
  const [evaluations, periods, options, session] = await Promise.all([
    listEvaluations(),
    listOpenPeriods(),
    getTeachableCourseSubjects(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Evaluaciones</h1>
      <p className="mt-1 text-sm text-slate-500">Cada evaluación agrupa las calificaciones de un curso y asignatura.</p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_380px]" : ""}`}>
        <EvaluationsAdminTable evaluations={evaluations} canWrite={allowedToWrite} userId={session?.userId ?? ""} />

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nueva evaluación</h2>
              <div className="mt-4">
                <EvaluationForm options={options} periods={periods} userId={session?.userId ?? ""} />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
