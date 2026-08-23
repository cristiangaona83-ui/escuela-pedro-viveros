import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { NewTeacherAssignmentForm } from "@/features/teacher-assignments/NewTeacherAssignmentForm";
import { EditAssignmentForm } from "@/features/teacher-assignments/EditAssignmentForm";
import { ToggleAssignmentActiveButton } from "@/features/teacher-assignments/ToggleAssignmentActiveButton";
import { listTeacherAssignments } from "@/services/teacher-assignments";
import { listCourseOptions, listAcademicYears, listTeachers } from "@/services/courses";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Carga docente" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export default async function CargaDocentePage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; docente?: string }>;
}) {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/cursos");

  const { curso, docente } = await searchParams;

  const [courseOptions, years, teacherRows, subjectOptions, assignments] = await Promise.all([
    listCourseOptions(),
    listAcademicYears(),
    listTeachers(),
    listSubjectOptions(),
    listTeacherAssignments({ courseId: curso || undefined, teacherId: docente || undefined }),
  ]);

  const activeYear = years.find((y) => y.active) ?? years[0];
  const teachers = (teacherRows as unknown as { profiles: { id: string; full_name: string } | null }[])
    .map((r) => r.profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));

  const courseSelectOptions = courseOptions.map((c) => ({ id: c.id, label: `${c.level} ${c.letter}` }));
  const teacherSelectOptions = teachers.map((t) => ({ id: t.id, label: t.full_name }));

  return (
    <div>
      <div className="flex items-center gap-2">
        <Briefcase className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Carga docente</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Asignaturas asignadas por curso y por docente. No modifica jefaturas — solo asignaciones de asignatura.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardBody>
            <form className="mb-4 flex flex-wrap items-end gap-3">
              <div className="w-56">
                <label className="mb-1 block text-xs font-medium text-slate-600">Filtrar por curso</label>
                <Select name="curso" defaultValue={curso ?? ""}>
                  <option value="">Todos los cursos</option>
                  {courseSelectOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
              </div>
              <div className="w-56">
                <label className="mb-1 block text-xs font-medium text-slate-600">Filtrar por docente</label>
                <Select name="docente" defaultValue={docente ?? ""}>
                  <option value="">Todos los docentes</option>
                  {teacherSelectOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Filtrar
              </button>
            </form>

            {assignments.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const label = `${a.subjects?.name ?? ""} — ${a.courses ? `${a.courses.level} ${a.courses.letter}` : ""} (${a.profiles?.full_name ?? "sin asignar"})`;
                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {a.subjects?.name} — {a.courses ? `${a.courses.level} ${a.courses.letter}` : "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.profiles?.full_name ?? "Sin asignar"}
                            {a.weekly_hours ? ` · ${a.weekly_hours} h/sem.` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!a.active && <Badge tone="neutral">Inactiva</Badge>}
                          <EditAssignmentForm
                            assignmentId={a.id}
                            currentTeacherId={a.teacher_id}
                            currentHours={a.weekly_hours}
                            teachers={teachers}
                            label={label}
                          />
                          <ToggleAssignmentActiveButton assignmentId={a.id} active={a.active} label={label} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Briefcase} title="Sin asignaciones" description="No hay carga docente registrada con este filtro." />
            )}
          </CardBody>
        </Card>

        {activeYear && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nueva asignación</h2>
              <div className="mt-4">
                <NewTeacherAssignmentForm
                  academicYearId={activeYear.id}
                  courses={courseSelectOptions}
                  subjects={subjectOptions.map((s) => ({ id: s.id, label: s.name }))}
                  teachers={teacherSelectOptions}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
