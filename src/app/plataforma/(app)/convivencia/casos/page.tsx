import type { Metadata } from "next";
import Link from "next/link";
import { Folder, FolderOpen as FolderOpenIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { listCases, listCaseCourseFolders, listCaseTypes } from "@/services/convivencia";
import { CASE_STATUS_LABELS, CASE_STATUS_TONE } from "@/features/convivencia/labels";

export const metadata: Metadata = { title: "Casos — Convivencia Educativa" };

export default async function ConvivenciaCasosPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string; type?: string; q?: string }>;
}) {
  const { course, status, type, q } = await searchParams;
  const [folders, cases, caseTypes] = await Promise.all([
    listCaseCourseFolders(),
    listCases({ courseId: course || undefined, status: status || undefined, caseTypeId: type || undefined, search: q || undefined }),
    listCaseTypes(),
  ]);

  const selectedFolder = folders.find((f) => f.id === course);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Casos</h2>
          <p className="text-sm text-slate-500">Navega por curso o filtra directamente el listado completo.</p>
        </div>
        <LinkButton href="/plataforma/convivencia/situaciones/nueva" size="sm">
          + Registrar situación
        </LinkButton>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {folders.map((f) => (
          <Link key={f.id} href={`/plataforma/convivencia/casos?course=${f.id}`}>
            <Card className={`h-full transition-shadow hover:shadow-md ${course === f.id ? "ring-2 ring-brand-500" : ""}`}>
              <CardBody className="flex flex-col items-center gap-1.5 py-4 text-center">
                <Folder className="h-6 w-6 text-brand-600" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-slate-900">{f.courseLabel}</span>
                <span className="text-[11px] text-slate-500">{f.count} caso{f.count === 1 ? "" : "s"} activo{f.count === 1 ? "" : "s"}</span>
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
              <Link href="/plataforma/convivencia/casos" className="text-xs font-medium text-brand-700 hover:underline">
                ← Todos los cursos
              </Link>
            </div>
          )}

          <form className="grid gap-2 sm:grid-cols-4">
            <Input name="q" defaultValue={q} placeholder="Buscar por nombre, apellido o folio…" className="sm:col-span-2" />
            <Select name="status" defaultValue={status ?? ""}>
              <option value="">Todos los estados</option>
              {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select name="type" defaultValue={type ?? ""}>
              <option value="">Todos los tipos</option>
              {caseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
            {course && <input type="hidden" name="course" value={course} />}
            <button type="submit" className="sm:col-span-4 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Filtrar
            </button>
          </form>

          {cases.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Folio</th>
                    <th className="py-2 pr-4">Estudiante(s)</th>
                    <th className="py-2 pr-4">Curso</th>
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4">Apertura</th>
                    <th className="py-2 pr-4">Responsable</th>
                    <th className="py-2 pr-4">Próximo seguimiento</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4">
                        <Link href={`/plataforma/convivencia/casos/${c.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                          {c.folio}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700">
                        {c.students.map((s) => `${s.student.last_names}, ${s.student.first_names}`).join(" · ") || "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">{Array.from(new Set(c.students.map((s) => s.courseLabel ?? "—"))).join(", ")}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{c.caseTypeLabel}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{formatDate(c.opened_at)}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{c.responsibleName}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{c.nextFollowupDate ? formatDate(c.nextFollowupDate) : "—"}</td>
                      <td className="py-2.5">
                        <Badge tone={CASE_STATUS_TONE[c.status]}>{CASE_STATUS_LABELS[c.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState icon={Folder} title="Sin casos" description="No hay casos que coincidan con los filtros seleccionados." />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
