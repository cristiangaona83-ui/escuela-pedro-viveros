import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Baby, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getParvulariaStudentReport } from "@/services/parvularia";
import { getTeachableCourses } from "@/services/academic-scope";
import { PARVULARIA_LEVEL_TITLE } from "@/config/parvularia";
import { ageLabel } from "@/lib/parvularia";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { ParvulariaEvaluationForm } from "@/features/parvularia/ParvulariaEvaluationForm";

export const metadata: Metadata = { title: "Registrar Informe Pedagógico" };

const ALLOWED_ROLES = ["director", "utp", "docente", "superadmin"] as const;
const BROAD_ROLES = ["director", "utp", "superadmin"] as const;

export default async function ParvulariaStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ cursoId: string; studentId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { cursoId, studentId } = await params;
  const { year } = await searchParams;
  if (!year) redirect("/plataforma/informes?nivel=prebasica");

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Registrar Informe Pedagógico</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para registrar informes de Educación Parvularia." />
        </div>
      </div>
    );
  }

  const report = await getParvulariaStudentReport(studentId, year);
  if (!report || report.courseId !== cursoId) notFound();

  if (!canWrite(session.roles, [...BROAD_ROLES])) {
    const teachable = await getTeachableCourses(year);
    if (!teachable.some((c) => c.course_id === cursoId)) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registrar Informe Pedagógico</h1>
          <div className="mt-6">
            <EmptyState icon={Users} title="Sin acceso" description="Solo puedes registrar a los niños(as) de tus cursos." />
          </div>
        </div>
      );
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Gestión Pedagógica", href: "/plataforma/areas/utp" },
          { label: "Informes", href: `/plataforma/informes?nivel=prebasica&year=${year}` },
          { label: `${report.courseLabel} — Informe Pedagógico`, href: `/plataforma/informes/parvularia/${cursoId}?year=${year}` },
          { label: report.studentName },
        ]}
      />

      <div className="mt-2 flex items-center gap-3">
        <Baby className="h-6 w-6 text-brand-700" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{report.studentName}</h1>
          <p className="text-sm text-slate-500">
            {report.courseLabel} · {PARVULARIA_LEVEL_TITLE[report.level]} · {report.year}
            {report.birthDate ? ` · ${ageLabel(report.birthDate)}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ParvulariaEvaluationForm
          studentId={report.studentId}
          academicYearId={year}
          indicators={report.indicators}
          initialValues={report.values}
          initialObservations={report.observations ?? ""}
          initialDeliveryDate={report.deliveryDate ?? ""}
        />
      </div>
    </div>
  );
}
