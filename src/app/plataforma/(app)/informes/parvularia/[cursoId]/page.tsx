import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Baby, Printer, Pencil, Eye, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClassName } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { getParvulariaCourseReports, reportProgress } from "@/services/parvularia";
import { getTeachableCourses } from "@/services/academic-scope";
import { parvulariaLevelOf } from "@/config/parvularia";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Informe Pedagógico — Prebásica" };

const ALLOWED_ROLES = ["director", "utp", "administrativo", "docente", "superadmin"] as const;
const BROAD_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export default async function ParvulariaCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ cursoId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { cursoId } = await params;
  const { year } = await searchParams;
  if (!year) redirect("/plataforma/informes?nivel=prebasica");

  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Informe Pedagógico</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para consultar estos informes." />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, level, letter").eq("id", cursoId).maybeSingle();
  if (!course || !parvulariaLevelOf(course.level)) notFound();

  if (!canWrite(session.roles, [...BROAD_ROLES])) {
    const teachable = await getTeachableCourses(year);
    if (!teachable.some((c) => c.course_id === cursoId)) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Informe Pedagógico</h1>
          <div className="mt-6">
            <EmptyState icon={Users} title="Sin acceso" description="Solo puedes ver los cursos de Prekínder o Kínder en los que enseñas." />
          </div>
        </div>
      );
    }
  }

  const courseLabel = `${course.level} ${course.letter}`.trim();
  const reports = await getParvulariaCourseReports(cursoId, year);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Gestión Pedagógica", href: "/plataforma/areas/utp" },
          { label: "Informes", href: `/plataforma/informes?nivel=prebasica&year=${year}` },
          { label: `${courseLabel} — Informe Pedagógico` },
        ]}
      />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Baby className="h-6 w-6 text-brand-700" /> {courseLabel} — Informe Pedagógico
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {reports.length} niño{reports.length === 1 ? "" : "s"}(as) · {reports[0]?.indicators.length ?? 0} indicadores
          </p>
        </div>
        {reports.length > 0 && (
          <a
            href={`/plataforma/api/informes/parvularia/masivo?course_id=${cursoId}&year=${year}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName("primary", "sm")}
          >
            <Printer className="h-4 w-4" /> Imprimir todos
          </a>
        )}
      </div>

      <Card className="mt-6">
        <CardBody>
          {reports.length === 0 ? (
            <EmptyState icon={Users} title="Sin niños(as) matriculados" description="Este curso no tiene matrícula activa para el año seleccionado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Niño(a)</th>
                    <th className="py-2 pr-3">1° Semestre</th>
                    <th className="py-2 pr-3">2° Semestre</th>
                    <th className="py-2 pr-3">Observaciones</th>
                    <th className="py-2 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const p = reportProgress(r);
                    const tone = (n: number) => (n === 0 ? "neutral" : n >= p.total ? "success" : "warning");
                    return (
                      <tr key={r.studentId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 text-slate-800">{r.studentName}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={tone(p.filled[1])}>{p.filled[1]}/{p.total}</Badge>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone={tone(p.filled[2])}>{p.filled[2]}/{p.total}</Badge>
                        </td>
                        <td className="py-2 pr-3">{p.hasObservations ? <Badge tone="success">Con observaciones</Badge> : <span className="text-xs text-slate-400">—</span>}</td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/plataforma/informes/parvularia/${cursoId}/${r.studentId}?year=${year}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Registrar
                            </Link>
                            <a
                              href={`/plataforma/api/informes/parvularia?student_id=${r.studentId}&year=${year}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" /> Ver PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
