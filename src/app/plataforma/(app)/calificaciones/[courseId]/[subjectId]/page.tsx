import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, ClipboardList, CheckCircle2, Clock, Settings } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getSubjectGradeMatrix } from "@/services/grade-overview";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { formatGrade } from "@/lib/utils";
import { SubjectGradeMatrixTable } from "@/features/grades/SubjectGradeMatrixTable";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export const metadata: Metadata = { title: "Calificaciones por asignatura" };

export default async function CalificacionesAsignaturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; subjectId: string }>;
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { courseId, subjectId } = await params;
  const sp = await searchParams;
  if (!sp.year) redirect("/plataforma/calificaciones");
  const year = sp.year;
  const period = sp.period;

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calificaciones</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para consultar esta vista." />
        </div>
      </div>
    );
  }

  const matrix = await getSubjectGradeMatrix(courseId, subjectId, year, period);
  if (!matrix) {
    return (
      <div>
        <EmptyState icon={Users} title="No encontrado" description="El curso o la asignatura no existen." />
      </div>
    );
  }

  const extraParams = `year=${year}${period ? `&period=${period}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 text-xs font-medium text-brand-700">
        <Link href="/plataforma/calificaciones" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Calificaciones
        </Link>
        <span className="text-slate-400">/</span>
        <Link href={`/plataforma/calificaciones/${courseId}?${extraParams}`} className="hover:underline">
          {matrix.courseLabel}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500">{matrix.subjectName}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {matrix.subjectName} — {matrix.courseLabel}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {matrix.students.length} estudiante{matrix.students.length === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" /> {matrix.evaluations.length} evaluacion{matrix.evaluations.length === 1 ? "" : "es"}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {matrix.studentsComplete} completo{matrix.studentsComplete === 1 ? "" : "s"}
          </span>
          {matrix.studentsPending > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Clock className="h-3.5 w-3.5" /> {matrix.studentsPending} pendiente{matrix.studentsPending === 1 ? "" : "s"}
            </span>
          )}
          {matrix.courseAverage !== null && <span>Promedio del curso: <strong>{formatGrade(matrix.courseAverage)}</strong></span>}
          {matrix.completionPercent !== null && <span>{matrix.completionPercent}% completado</span>}
        </p>
        </div>
        <LinkButton href={`/plataforma/calificaciones/${courseId}/${subjectId}/evaluaciones?${extraParams}`} variant="secondary" size="sm">
          <Settings className="h-4 w-4" /> Gestionar evaluaciones
        </LinkButton>
      </div>

      <Card className="mt-6">
        <CardBody>
          <SubjectGradeMatrixTable matrix={matrix} />
        </CardBody>
      </Card>
    </div>
  );
}
