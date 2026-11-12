import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardSignature, UserPlus, Inbox, FileText, Users, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getActiveAcademicYear } from "@/services/courses";
import { formatDate, formatRun } from "@/lib/utils";

export const metadata: Metadata = { title: "Matrícula" };

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "administrativo"] as const;

export default async function MatriculaPage() {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Matrícula</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para ver el módulo de matrícula." />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const year = await getActiveAcademicYear();

  const [{ data: recent }, { count: activeCount }, { count: pendingCount }] = await Promise.all([
    year
      ? supabase
          .from("enrollments")
          .select("id, student_id, status, enrolled_at, enrollment_number, admission_condition, students(first_names, last_names, run), courses(level, letter)")
          .eq("academic_year_id", year.id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    year
      ? supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("academic_year_id", year.id).eq("status", "activa")
      : Promise.resolve({ count: 0 }),
    supabase.from("prematricula_requests").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
  ]);

  type Row = {
    id: string;
    student_id: string;
    status: string;
    enrolled_at: string;
    enrollment_number: string | null;
    admission_condition: string | null;
    students: { first_names: string; last_names: string; run: string } | null;
    courses: { level: string; letter: string } | null;
  };
  const rows = (recent ?? []) as unknown as Row[];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Inspectoría General" }, { label: "Matrícula" }]} />
      <div className="mt-2 flex items-center gap-3">
        <ClipboardSignature className="h-6 w-6 text-brand-700" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Matrícula {year?.year ?? ""}</h1>
          <p className="text-sm text-slate-500">Registro de matrículas y pre-matrícula en línea. Cambia el año con el selector de la barra superior.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label={`Matriculados ${year?.year ?? ""}`} value={activeCount ?? 0} />
        <StatCard icon={Inbox} label="Pre-matrículas por revisar" value={pendingCount ?? 0} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/plataforma/matricula/nueva">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardBody className="space-y-2">
              <UserPlus className="h-6 w-6 text-brand-700" />
              <h2 className="font-semibold text-slate-900">Nueva matrícula</h2>
              <p className="text-sm text-slate-500">Ficha en 3 pasos: estudiante, apoderados, retiro y constancias. Crea la ficha y la matrícula de una vez.</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">Matricular <ArrowRight className="h-3.5 w-3.5" /></span>
            </CardBody>
          </Card>
        </Link>
        <Link href="/plataforma/matricula/prematricula">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardBody className="space-y-2">
              <Inbox className="h-6 w-6 text-brand-700" />
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                Pre-matrícula en línea {(pendingCount ?? 0) > 0 && <Badge tone="warning">{pendingCount}</Badge>}
              </h2>
              <p className="text-sm text-slate-500">Genera el enlace para que las familias completen la ficha y revisa las solicitudes recibidas.</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">Abrir <ArrowRight className="h-3.5 w-3.5" /></span>
            </CardBody>
          </Card>
        </Link>
        <a href="/plataforma/api/matricula/ficha?blank=1" target="_blank" rel="noopener noreferrer">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardBody className="space-y-2">
              <FileText className="h-6 w-6 text-brand-700" />
              <h2 className="font-semibold text-slate-900">Ficha en blanco (PDF)</h2>
              <p className="text-sm text-slate-500">La ficha de matrícula para imprimir y completar a mano, de contingencia o para atención en mesón.</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">Descargar <ArrowRight className="h-3.5 w-3.5" /></span>
            </CardBody>
          </Card>
        </a>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Matrículas recientes</h2>
      <Card className="mt-3">
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState icon={Users} title="Aún no hay matrículas en este año" description="Registra la primera con «Nueva matrícula» o haz el Traspaso de año." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Estudiante</th>
                    <th className="py-2 pr-3">Curso</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Folio</th>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3">
                        <Link href={`/plataforma/estudiantes/${r.student_id}`} className="font-medium text-slate-800 hover:text-brand-700">
                          {r.students ? `${r.students.last_names}, ${r.students.first_names}` : "—"}
                        </Link>
                        <span className="ml-2 text-xs text-slate-400">{formatRun(r.students?.run)}</span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{r.courses ? `${r.courses.level} ${r.courses.letter}` : "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{r.admission_condition ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs text-slate-500">{r.enrollment_number ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{formatDate(r.enrolled_at)}</td>
                      <td className="py-2 pr-3">
                        <a
                          href={`/plataforma/api/matricula/ficha?student_id=${r.student_id}&year=${year?.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          Imprimir
                        </a>
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
