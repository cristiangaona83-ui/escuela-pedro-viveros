import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEvaluationGradeSheet } from "@/services/grade-overview";
import { getGradingConfig } from "@/services/school-config";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { EvaluationGradeSheet } from "@/features/grades/EvaluationGradeSheet";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export const metadata: Metadata = { title: "Administrar calificaciones" };

export default async function AdministrarCalificacionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; subjectId: string; evaluationId: string }>;
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { courseId, subjectId, evaluationId } = await params;
  const sp = await searchParams;
  if (!sp.year) redirect(`/plataforma/calificaciones/${courseId}/${subjectId}`);
  const year = sp.year;
  const period = sp.period;

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calificaciones</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para administrar calificaciones." />
        </div>
      </div>
    );
  }

  const [sheet, gradingConfig] = await Promise.all([getEvaluationGradeSheet(evaluationId, year), getGradingConfig()]);
  if (!sheet) {
    return (
      <div>
        <EmptyState icon={Users} title="Evaluación no encontrada" />
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
          {sheet.courseLabel}
        </Link>
        <span className="text-slate-400">/</span>
        <Link href={`/plataforma/calificaciones/${courseId}/${subjectId}/evaluaciones?${extraParams}`} className="hover:underline">
          {sheet.subjectName}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500">{sheet.evaluationName}</span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{sheet.evaluationName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {sheet.subjectName} · {sheet.courseLabel} — administración de calificaciones
      </p>

      <div className="mt-6">
        <EvaluationGradeSheet sheet={sheet} gradingConfig={gradingConfig} />
      </div>
    </div>
  );
}
