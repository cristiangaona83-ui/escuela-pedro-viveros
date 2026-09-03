import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users, History } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getGradeChangeHistory } from "@/services/grade-history";
import { listCourseOptions } from "@/services/courses";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { GradeHistoryTable } from "@/features/grades/GradeHistoryTable";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export const metadata: Metadata = { title: "Historial de calificaciones" };

export default async function GradeHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; subject?: string; evaluation?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Historial de calificaciones</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para ver el historial de calificaciones." />
        </div>
      </div>
    );
  }

  const [entries, courses, subjects] = await Promise.all([
    getGradeChangeHistory({
      courseId: sp.course || undefined,
      subjectId: sp.subject || undefined,
      evaluationId: sp.evaluation || undefined,
      dateFrom: sp.from || undefined,
      dateTo: sp.to || undefined,
    }),
    listCourseOptions(),
    listSubjectOptions(),
  ]);

  return (
    <div>
      <Link href="/plataforma/calificaciones" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Calificaciones
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <History className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Historial de modificaciones</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Registro de creación, modificación y eliminación de calificaciones. Últimos 200 movimientos según los filtros.</p>

      <div className="mt-6">
        <GradeHistoryTable
          entries={entries}
          courses={courses}
          subjects={subjects}
          selectedCourseId={sp.course ?? ""}
          selectedSubjectId={sp.subject ?? ""}
          dateFrom={sp.from ?? ""}
          dateTo={sp.to ?? ""}
        />
      </div>
    </div>
  );
}
