import type { Metadata } from "next";
import Link from "next/link";
import { Users, BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradeEntryGrid } from "@/features/grades/GradeEntryGrid";
import { CalificacionesFilterBar } from "@/features/grades/CalificacionesFilterBar";
import { getTeachableCourseSubjects, listOpenPeriods } from "@/services/academic-scope";
import { getGradingConfig } from "@/services/school-config";
import { getCourseGradeSummaries } from "@/services/grade-overview";
import { listAcademicYears, getActiveAcademicYear, levelSortIndex } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Calificaciones" };

const WRITE_ROLES = ["director", "superadmin", "docente"] as const;
const MANAGEMENT_ROLES = ["director", "utp", "superadmin"] as const;

export default async function CalificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const [options, periods, gradingConfig, session] = await Promise.all([
    getTeachableCourseSubjects(),
    listOpenPeriods(),
    getGradingConfig(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const isManagement = canWrite(session?.roles ?? [], [...MANAGEMENT_ROLES]);

  let overview: { academicYears: Awaited<ReturnType<typeof listAcademicYears>>; selectedYearId: string; yearPeriods: typeof periods; selectedPeriodId: string; courses: Awaited<ReturnType<typeof getCourseGradeSummaries>> } | null = null;

  if (isManagement) {
    const [academicYears, activeYear] = await Promise.all([listAcademicYears(), getActiveAcademicYear()]);
    const selectedYearId = sp.year || activeYear?.id || academicYears[0]?.id || "";
    const yearPeriods = periods.filter((p) => p.academic_year_id === selectedYearId);
    const selectedPeriodId = sp.period || "";
    const courses = selectedYearId
      ? (await getCourseGradeSummaries(selectedYearId, selectedPeriodId || undefined)).sort(
          (a, b) => levelSortIndex(a.courseLevel) - levelSortIndex(b.courseLevel) || a.courseLetter.localeCompare(b.courseLetter)
        )
      : [];
    overview = { academicYears, selectedYearId, yearPeriods, selectedPeriodId, courses };
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Calificaciones</h1>
      <p className="mt-1 text-sm text-slate-500">
        Libro de notas digital. Escala {gradingConfig.scaleMin.toFixed(1)} a {gradingConfig.scaleMax.toFixed(1)}, nota mínima de
        aprobación {gradingConfig.approvalMinimum.toFixed(1)}.
      </p>

      {overview && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Resumen por curso</h2>
          <p className="mt-1 text-xs text-slate-500">Vista de consulta para revisar rápidamente qué cursos tienen calificaciones pendientes.</p>
          <div className="mt-4">
            <CalificacionesFilterBar
              academicYears={overview.academicYears}
              periods={overview.yearPeriods}
              year={overview.selectedYearId}
              period={overview.selectedPeriodId}
            />
          </div>
          <div className="mt-4">
            {overview.courses.length === 0 ? (
              <EmptyState icon={Users} title="Sin cursos registrados" description="No hay cursos activos para el año seleccionado." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {overview.courses.map((c) => (
                  <Link key={c.courseId} href={`/plataforma/calificaciones/${c.courseId}?year=${overview!.selectedYearId}${overview!.selectedPeriodId ? `&period=${overview!.selectedPeriodId}` : ""}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardBody className="flex flex-col items-center gap-1 py-4 text-center">
                        <span className="text-sm font-semibold text-slate-900">{c.courseLabel}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Users className="h-3 w-3" /> {c.studentCount} estudiante{c.studentCount === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <BookOpen className="h-3 w-3" /> {c.subjectCount} asignatura{c.subjectCount === 1 ? "" : "s"}
                        </span>
                        {c.subjectCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> {c.subjectsComplete}/{c.subjectCount} completas ({c.completionPercent}%)
                          </span>
                        )}
                        <span className="mt-1 text-[11px] font-medium text-brand-700">Ver curso</span>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        {overview && <h2 className="text-lg font-semibold text-slate-900">Libro de notas</h2>}
        <Card className="mt-4">
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
    </div>
  );
}
