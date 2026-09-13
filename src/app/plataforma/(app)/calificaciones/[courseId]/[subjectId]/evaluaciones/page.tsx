import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getCourseSubjectEvaluations } from "@/services/grade-overview";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { EvaluationsListClient } from "@/features/grades/EvaluationsListClient";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export const metadata: Metadata = { title: "Gestionar evaluaciones" };

export default async function GestionarEvaluacionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; subjectId: string }>;
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { courseId, subjectId } = await params;
  const sp = await searchParams;
  if (!sp.year || !sp.period) redirect(`/plataforma/calificaciones/${courseId}/${subjectId}`);
  const year = sp.year;
  const period = sp.period;

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calificaciones</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para administrar evaluaciones." />
        </div>
      </div>
    );
  }

  const data = await getCourseSubjectEvaluations(courseId, subjectId, period);
  if (!data) {
    return (
      <div>
        <EmptyState icon={Users} title="No encontrado" description="El curso o la asignatura no existen." />
      </div>
    );
  }

  const extraParams = `year=${year}&period=${period}`;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Gestión Pedagógica", href: "/plataforma/areas/utp" },
          { label: "Calificaciones", href: "/plataforma/calificaciones" },
          { label: data.courseLabel, href: `/plataforma/calificaciones/${courseId}?${extraParams}` },
          { label: data.subjectName, href: `/plataforma/calificaciones/${courseId}/${subjectId}?${extraParams}` },
          { label: "Gestionar evaluaciones" },
        ]}
      />

      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        Evaluaciones — {data.subjectName} · {data.courseLabel}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Crea, edita y administra las evaluaciones de esta asignatura para el período seleccionado.</p>

      <div className="mt-6">
        <EvaluationsListClient data={data} year={year} periodId={period} userId={session.userId} />
      </div>
    </div>
  );
}
