import type { Metadata } from "next";
import Link from "next/link";
import { Folder, FolderOpen as FolderOpenIcon, FileText } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { listSituations, listSituationCourseFolders } from "@/services/convivencia";

export const metadata: Metadata = { title: "Situaciones — Convivencia Educativa" };

export default async function ConvivenciaSituacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; q?: string }>;
}) {
  const { course, q } = await searchParams;
  const [folders, situations] = await Promise.all([
    listSituationCourseFolders(),
    listSituations({ courseId: course || undefined, search: q || undefined }),
  ]);
  const selectedFolder = folders.find((f) => f.id === course);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Situaciones</h2>
          <p className="text-sm text-slate-500">Registros individuales — pueden convertirse en Caso cuando corresponde.</p>
        </div>
        <LinkButton href="/plataforma/convivencia/situaciones/nueva" size="sm">
          + Registrar situación
        </LinkButton>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {folders.map((f) => (
          <Link key={f.id} href={`/plataforma/convivencia/situaciones?course=${f.id}`}>
            <Card className={`h-full transition-shadow hover:shadow-md ${course === f.id ? "ring-2 ring-brand-500" : ""}`}>
              <CardBody className="flex flex-col items-center gap-1.5 py-4 text-center">
                <Folder className="h-6 w-6 text-brand-600" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-slate-900">{f.courseLabel}</span>
                <span className="text-[11px] text-slate-500">{f.count} situación{f.count === 1 ? "" : "es"}</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardBody>
          {selectedFolder && (
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <FolderOpenIcon className="h-4 w-4 text-brand-600" /> {selectedFolder.courseLabel}
              </span>
              <Link href="/plataforma/convivencia/situaciones" className="text-xs font-medium text-brand-700 hover:underline">
                ← Todos los cursos
              </Link>
            </div>
          )}

          <form className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Buscar por nombre, apellido o descripción…" />
            {course && <input type="hidden" name="course" value={course} />}
            <button type="submit" className="shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Buscar
            </button>
          </form>

          {situations.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {situations.map((s) => (
                <li key={s.id} className="py-3">
                  <Link href={`/plataforma/convivencia/situaciones/${s.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {s.students.map((st) => `${st.student.last_names}, ${st.student.first_names}`).join(" · ") || "Sin estudiantes"}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(s.occurred_on)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{s.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge tone="neutral">{s.case_type_label}</Badge>
                      {s.case_id ? <Badge tone="brand">Es un caso</Badge> : <Badge tone="warning">Registro simple</Badge>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState icon={FileText} title="Sin situaciones" description="No hay situaciones registradas que coincidan." />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
