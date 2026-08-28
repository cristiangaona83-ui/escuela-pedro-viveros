import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { CalendarCheck, BarChart3, CalendarOff } from "lucide-react";
import { AttendanceGrid } from "@/features/attendance/AttendanceGrid";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Asistencia" };

const WRITE_ROLES = ["director", "utp", "docente", "superadmin", "inspectoria_general"] as const;
const REPORT_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;

export default async function AsistenciaPage() {
  const [courses, session] = await Promise.all([getTeachableCourses(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const allowedReports = canWrite(session?.roles ?? [], [...REPORT_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Asistencia</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro diario de presente, ausente, atraso y retiro por curso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowedReports && (
            <LinkButton href="/plataforma/asistencia/reportes" variant="secondary" size="sm">
              <BarChart3 className="h-4 w-4" /> Ver reportes
            </LinkButton>
          )}
          {allowedReports && (
            <LinkButton href="/plataforma/asistencia/administracion" variant="secondary" size="sm">
              <CalendarOff className="h-4 w-4" /> Administrar calendario
            </LinkButton>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <CardBody>
          {courses.length > 0 ? (
            <AttendanceGrid courses={courses} canWrite={allowedToWrite} />
          ) : (
            <EmptyState
              icon={CalendarCheck}
              title="Sin cursos asignados"
              description="No tienes cursos como docente de asignatura o profesor jefe."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
