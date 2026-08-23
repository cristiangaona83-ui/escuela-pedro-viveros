import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { CourseRosterActions } from "@/features/reports/CourseRosterActions";
import { listAcademicYears } from "@/services/courses";
import { getTeachableCourses } from "@/services/academic-scope";
import { getCourseRoster } from "@/services/course-roster";
import { formatDate } from "@/lib/utils";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Listados por curso" };

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const STATUS_TONE = { activa: "success", retirada: "danger", trasladada: "neutral" } as const;
const STATUS_LABEL = { activa: "Matriculado", retirada: "Retirado", trasladada: "Trasladado" } as const;

export default async function ListadosPorCursoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; curso?: string }>;
}) {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/estudiantes");

  const years = await listAcademicYears();
  const { anio, curso } = await searchParams;
  const selectedYearId = anio || years.find((y) => y.active)?.id || years[0]?.id;
  const courses = selectedYearId ? await getTeachableCourses(selectedYearId) : [];
  const selectedCourseId = curso && courses.some((c) => c.course_id === curso) ? curso : undefined;
  const roster = selectedCourseId ? await getCourseRoster(selectedCourseId) : null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Listados por curso</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Nómina de estudiantes matriculados por año y curso, exportable en PDF o CSV.</p>

      <Card className="mt-6">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <label className="mb-1 block text-xs font-medium text-slate-600">Año</label>
              <Select name="anio" defaultValue={selectedYearId ?? ""}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.year}</option>
                ))}
              </Select>
            </div>
            <div className="w-64">
              <label className="mb-1 block text-xs font-medium text-slate-600">Curso</label>
              <Select name="curso" defaultValue={selectedCourseId ?? ""}>
                <option value="" disabled>Selecciona…</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>{c.course_label}</option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Ver listado
            </button>
          </form>

          {roster && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{roster.courseLabel} · {roster.academicYear}</h2>
                  <p className="text-xs text-slate-500">Total: {roster.students.length} estudiantes</p>
                </div>
                <CourseRosterActions courseId={selectedCourseId!} />
              </div>

              {roster.students.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2">N°</th>
                        <th className="px-4 py-2">Nombre completo</th>
                        <th className="px-4 py-2">RUN</th>
                        <th className="px-4 py-2">Fecha de nacimiento</th>
                        <th className="px-4 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.students.map((s, i) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-2 font-medium text-slate-800">{s.last_names}, {s.first_names}</td>
                          <td className="px-4 py-2 text-slate-500">{s.run}</td>
                          <td className="px-4 py-2 text-slate-500">{s.birth_date ? formatDate(s.birth_date) : "—"}</td>
                          <td className="px-4 py-2"><Badge tone={STATUS_TONE[s.enrollment_status]}>{STATUS_LABEL[s.enrollment_status]}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={ClipboardList} title="Sin estudiantes" description="Este curso no tiene matrículas registradas." />
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
