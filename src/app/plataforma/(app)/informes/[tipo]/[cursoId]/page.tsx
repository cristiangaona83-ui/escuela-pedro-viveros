import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users, CheckCircle2, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { getCourseSubjectAverages } from "@/services/report-data";
import { getCourseGradeDetail } from "@/services/grade-overview";
import { isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { PrintAllButton } from "@/features/reports/PrintAllButton";
import { StudentReportActions } from "@/features/reports/StudentReportActions";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

const TIPO_LABEL: Record<string, string> = {
  semestral: "Informe Semestral",
  anual: "Informe Anual",
  "cierre-anio": "Informe de Cierre de Año",
};

export async function generateMetadata({ params }: { params: Promise<{ tipo: string; cursoId: string }> }): Promise<Metadata> {
  const { tipo } = await params;
  return { title: TIPO_LABEL[tipo] ?? "Informes" };
}

export default async function InformesCursoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tipo: string; cursoId: string }>;
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { tipo, cursoId } = await params;
  const sp = await searchParams;
  if (!TIPO_LABEL[tipo]) notFound();
  if (!sp.year) redirect("/plataforma/informes");
  if (tipo === "semestral" && !sp.period) redirect("/plataforma/informes");
  const year = sp.year;
  const period = sp.period;

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{TIPO_LABEL[tipo]}</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para consultar informes." />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("level, letter").eq("id", cursoId).maybeSingle();
  if (!course || !isEnsenanzaBasica(course.level)) notFound();

  const courseLabel = `${course.level} ${course.letter}`.trim();
  const periodForQuery = tipo === "semestral" ? period : undefined;
  const [reports, gradeDetail] = await Promise.all([
    getCourseSubjectAverages(cursoId, year, periodForQuery),
    getCourseGradeDetail(cursoId, year, periodForQuery),
  ]);
  const completed = reports.filter((r) => r.generalAverage !== null);
  const pending = reports.filter((r) => r.generalAverage === null);
  const subjectsPending = (gradeDetail?.subjects ?? [])
    .filter((s) => s.status !== "completo")
    .map((s) => (s.status === "sin_evaluaciones" ? `${s.subjectName} (sin evaluaciones)` : `${s.subjectName}: ${s.studentsPending} pendiente${s.studentsPending === 1 ? "" : "s"}`));

  return (
    <div>
      <Link href="/plataforma/informes" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Informes
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {courseLabel} — {TIPO_LABEL[tipo]}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {reports.length} estudiante{reports.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {completed.length} completado{completed.length === 1 ? "" : "s"}
            </span>
            {pending.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Clock className="h-3.5 w-3.5" /> {pending.length} pendiente{pending.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <PrintAllButton
          tipo={tipo}
          courseId={cursoId}
          courseLabel={courseLabel}
          year={year}
          period={period}
          pendingCount={pending.length}
          availableCount={completed.length}
          subjectsPending={subjectsPending}
        />
      </div>

      <Card className="mt-6">
        <CardBody>
          {reports.length === 0 ? (
            <EmptyState icon={Users} title="Sin estudiantes matriculados" description="Este curso no tiene matrícula activa para el año seleccionado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Estudiante</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.studentId} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 text-slate-800">{r.studentName}</td>
                      <td className="py-2 pr-3">
                        {r.generalAverage !== null ? (
                          <Badge tone="success">Completado</Badge>
                        ) : (
                          <Badge tone="warning">Pendiente</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <StudentReportActions tipo={tipo} studentId={r.studentId} courseId={cursoId} year={year} period={period} available={r.generalAverage !== null} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
