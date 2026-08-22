import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/Card";
import { GradeEntryGrid } from "@/features/grades/GradeEntryGrid";
import { getTeachableCourseSubjects, listOpenPeriods } from "@/services/academic-scope";
import { getGradingConfig } from "@/services/school-config";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Calificaciones" };

const WRITE_ROLES = ["director", "superadmin", "docente"] as const;

export default async function CalificacionesPage() {
  const [options, periods, gradingConfig, session] = await Promise.all([
    getTeachableCourseSubjects(),
    listOpenPeriods(),
    getGradingConfig(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Calificaciones</h1>
      <p className="mt-1 text-sm text-slate-500">
        Libro de notas digital. Escala {gradingConfig.scaleMin.toFixed(1)} a {gradingConfig.scaleMax.toFixed(1)}, nota mínima de
        aprobación {gradingConfig.approvalMinimum.toFixed(1)}.
      </p>

      <Card className="mt-6">
        <CardBody>
          <GradeEntryGrid
            options={options}
            periods={periods}
            gradingConfig={gradingConfig}
            userId={session?.userId ?? ""}
            canWrite={allowedToWrite}
          />
        </CardBody>
      </Card>
    </div>
  );
}
