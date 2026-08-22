import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listEvaluations } from "@/services/evaluations";
import { listOpenPeriods, getTeachableCourseSubjects } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { EvaluationForm } from "@/features/evaluations/EvaluationForm";

export const metadata: Metadata = { title: "Evaluaciones" };

const STATUS_TONE = { planificada: "neutral", aplicada: "brand", cerrada: "success" } as const;
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
        <Card>
          <CardBody>
            {evaluations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Evaluación</th>
                      <th className="py-2 pr-4">Curso</th>
                      <th className="py-2 pr-4">Asignatura</th>
                      <th className="py-2 pr-4">Período</th>
                      <th className="py-2 pr-4">Fecha</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluations.map((ev) => {
                      const e = ev as unknown as {
                        id: string; name: string; status: keyof typeof STATUS_TONE; eval_date: string | null;
                        courses: { level: string; letter: string } | null;
                        subjects: { name: string } | null;
                        academic_periods: { name: string } | null;
                      };
                      return (
                        <tr key={e.id}>
                          <td className="py-2.5 pr-4 font-medium text-slate-800">{e.name}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{e.courses ? `${e.courses.level} ${e.courses.letter}` : "—"}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{e.subjects?.name ?? "—"}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{e.academic_periods?.name ?? "—"}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{formatDate(e.eval_date)}</td>
                          <td className="py-2.5"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="Sin evaluaciones registradas" description="Crea la primera evaluación para comenzar a ingresar calificaciones." />
            )}
          </CardBody>
        </Card>

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
