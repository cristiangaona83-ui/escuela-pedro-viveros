import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, FileBarChart } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getCourseGradeDetail } from "@/services/grade-overview";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { CourseSubjectList } from "@/features/grades/CourseSubjectList";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export const metadata: Metadata = { title: "Calificaciones del curso" };

export default async function CalificacionesCursoPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { courseId } = await params;
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

  const detail = await getCourseGradeDetail(courseId, year, period);
  if (!detail) {
    return (
      <div>
        <EmptyState icon={Users} title="Curso no encontrado" />
      </div>
    );
  }

  const extraParams = `year=${year}${period ? `&period=${period}` : ""}`;

  return (
    <div>
      <Link href="/plataforma/calificaciones" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Calificaciones
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{detail.courseLabel}</h1>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
            <Users className="h-3.5 w-3.5" /> {detail.studentCount} estudiante{detail.studentCount === 1 ? "" : "s"}
          </p>
        </div>
        <LinkButton href="/plataforma/informes" variant="secondary" size="sm">
          <FileBarChart className="h-4 w-4" /> Ver informes del curso
        </LinkButton>
      </div>

      <Card className="mt-6">
        <CardBody>
          <CourseSubjectList courseId={courseId} subjects={detail.subjects} extraParams={extraParams} />
        </CardBody>
      </Card>
    </div>
  );
}
