import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, BookOpen, UserSquare2, ClipboardList, FileBarChart, BarChart3, CheckCircle2, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { StatCard } from "@/components/ui/StatCard";
import { LinkButton } from "@/components/ui/Button";
import { getCourse } from "@/services/courses";
import { getCourseGradeDetail } from "@/services/grade-overview";
import { getCourseSubjectAverages } from "@/services/report-data";
import { listEvaluationScopeCounts } from "@/services/evaluations";
import { listOpenPeriods } from "@/services/academic-scope";
import { isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { CourseSubjectList } from "@/features/grades/CourseSubjectList";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { createClient } from "@/lib/supabase/server";
import { formatGrade } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalle del curso" };

const GRADES_ROLES = ["director", "utp", "superadmin"] as const;
const EVALUATIONS_ROLES = ["director", "utp", "docente", "superadmin"] as const;
const INFORMES_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

interface EnrollmentJoin {
  id: string;
  status: string;
  students: { id: string; first_names: string; last_names: string; run: string } | null;
}
interface AssignmentRow {
  id: string;
  subject_id: string;
  teacher_id: string | null;
  subjects: { id: string; name: string; linked_subject_id: string | null } | null;
  profiles: { full_name: string } | null;
}

export default async function CursoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const [course, session] = await Promise.all([getCourse(id), getSessionContext()]);
  if (!course) notFound();

  const roles = session?.roles ?? [];
  const canGrades = canWrite(roles, [...GRADES_ROLES]);
  const canEvaluations = canWrite(roles, [...EVALUATIONS_ROLES]);
  const canInformes = canWrite(roles, [...INFORMES_ROLES]);
  const academicYearId = (course as unknown as { academic_year_id: string }).academic_year_id;
  const courseLabel = `${course.level} ${course.letter}`.trim();

  const TABS: TabItem[] = [
    { key: "resumen", label: "Resumen" },
    { key: "estudiantes", label: "Estudiantes" },
    { key: "asignaturas", label: "Asignaturas" },
    { key: "docentes", label: "Docentes" },
    ...(canEvaluations ? [{ key: "evaluaciones", label: "Evaluaciones" }] : []),
    ...(canGrades ? [{ key: "calificaciones", label: "Calificaciones" }] : []),
    ...(canInformes ? [{ key: "informes", label: "Informes" }] : []),
    ...(canGrades ? [{ key: "indicadores", label: "Indicadores" }] : []),
  ];
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "resumen";

  const enrollments = (course as unknown as { enrollments: EnrollmentJoin[] }).enrollments ?? [];
  const activeEnrollments = enrollments.filter((e) => e.status === "activa");
  const teacherName = (course as unknown as { profiles: { full_name: string } | null }).profiles?.full_name;

  // Asignaturas + docentes (con linked_subject_id para mostrar los Talleres
  // vinculados a su asignatura troncal, ver 0053_subjects_linked_subject.sql)
  // -- consulta propia de esta página, no la de `getCourse()` (esa no trae
  // linked_subject_id ni subject_id/teacher_id planos, y no se modifica para
  // no afectar a quien más la use).
  const supabase = await createClient();
  const { data: assignmentRows } = await supabase
    .from("teacher_assignments")
    .select("id, subject_id, teacher_id, subjects(id, name, linked_subject_id), profiles(full_name)")
    .eq("course_id", id)
    .eq("active", true);
  const assignments = ((assignmentRows ?? []) as unknown as AssignmentRow[]).sort((a, b) => (a.subjects?.name ?? "").localeCompare(b.subjects?.name ?? ""));
  const subjectNameById = new Map(assignments.map((a) => [a.subject_id, a.subjects?.name ?? "Asignatura"]));

  const teacherCount = new Set(assignments.map((a) => a.teacher_id).filter((t): t is string => t !== null)).size;

  // Evaluaciones: solo conteo por asignatura -- la gestión completa (crear,
  // editar, calificar) sigue viviendo en /plataforma/evaluaciones, esta
  // pestaña es un acceso rápido, no una reimplementación.
  const evalCounts = tab === "evaluaciones" ? await listEvaluationScopeCounts(id) : [];
  const evalCountBySubject = new Map<string, number>();
  for (const e of evalCounts) evalCountBySubject.set(e.subject_id, (evalCountBySubject.get(e.subject_id) ?? 0) + 1);

  const needsGradeDetail = tab === "resumen" || tab === "calificaciones" || tab === "indicadores";
  const gradeDetail = needsGradeDetail ? await getCourseGradeDetail(id, academicYearId) : null;

  // Promedio general del curso -- solo Enseñanza Básica (igual restricción
  // que Informes) y solo si hay un período abierto; reutiliza la misma
  // función que usan los Informes, nunca un cálculo propio.
  let courseAverage: number | null = null;
  if (tab === "indicadores" && isEnsenanzaBasica(course.level)) {
    const periods = await listOpenPeriods();
    const currentPeriod = periods.find((p) => p.academic_year_id === academicYearId && p.status === "abierto") ?? null;
    if (currentPeriod) {
      const reports = await getCourseSubjectAverages(id, academicYearId, currentPeriod.id);
      const averages = reports.map((r) => r.generalAverage).filter((a): a is number => a !== null);
      courseAverage = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : null;
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Gestión Pedagógica", href: "/plataforma/areas/utp" },
          { label: "Cursos", href: "/plataforma/cursos" },
          { label: courseLabel },
        ]}
      />
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{courseLabel}</h1>
      <p className="mt-1 text-sm text-slate-500">Profesor jefe: {teacherName ?? "Sin asignar"}</p>

      <div className="mt-4">
        <Tabs basePath={`/plataforma/cursos/${id}`} tabs={TABS} active={tab} />
      </div>

      <div className="mt-6">
        {tab === "resumen" && (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={Users} label="Estudiantes" value={activeEnrollments.length} />
              <StatCard icon={BookOpen} label="Asignaturas" value={assignments.length} />
              <StatCard icon={UserSquare2} label="Docentes" value={teacherCount} />
              {gradeDetail && (
                <StatCard
                  icon={CheckCircle2}
                  label="Calificaciones completas"
                  value={`${gradeDetail.subjects.filter((s) => s.status === "completo").length}/${gradeDetail.subjects.length}`}
                  tone={gradeDetail.subjects.some((s) => s.status === "pendiente") ? "warning" : "success"}
                />
              )}
            </div>
          </div>
        )}

        {tab === "estudiantes" && (
          <Card>
            <CardBody>
              {activeEnrollments.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {activeEnrollments.map((e) => (
                    <li key={e.id} className="py-2.5 text-sm">
                      <Link href={`/plataforma/estudiantes/${e.students?.id}`} className="font-medium text-brand-700 hover:underline">
                        {e.students?.last_names}, {e.students?.first_names}
                      </Link>
                      <span className="ml-2 text-slate-400">{e.students?.run}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Users} title="Sin estudiantes matriculados" description="Aún no hay matrícula activa en este curso." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "asignaturas" && (
          <Card>
            <CardBody>
              {assignments.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <div>
                        <span className="text-slate-700">{a.subjects?.name}</span>
                        {a.subjects?.linked_subject_id && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            Vinculada a {subjectNameById.get(a.subjects.linked_subject_id) ?? "otra asignatura"} · no cuenta aparte en el promedio general
                          </p>
                        )}
                      </div>
                      <Badge tone="brand">{a.profiles?.full_name ?? "Sin asignar"}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={BookOpen} title="Sin asignaturas asignadas" description="Asigna docentes a las asignaturas desde Cursos → Carga docente." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "docentes" && (
          <Card>
            <CardBody>
              {assignments.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {Array.from(new Map(assignments.map((a) => [a.teacher_id, a.profiles?.full_name ?? "Sin asignar"])).entries()).map(([teacherId, name]) => {
                    const subjects = assignments.filter((a) => a.teacher_id === teacherId).map((a) => a.subjects?.name).filter(Boolean);
                    return (
                      <li key={teacherId ?? "sin-asignar"} className="py-2.5 text-sm">
                        <span className="font-medium text-slate-800">{name}</span>
                        <p className="mt-0.5 text-xs text-slate-500">{subjects.join(", ")}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={UserSquare2} title="Sin docentes asignados" description="Asigna docentes a las asignaturas desde Cursos → Carga docente." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "evaluaciones" && canEvaluations && (
          <Card>
            <CardBody>
              {assignments.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-700">{a.subjects?.name}</span>
                      <Link
                        href={`/plataforma/evaluaciones/${id}/${a.subject_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        {evalCountBySubject.get(a.subject_id) ?? 0} evaluacion{(evalCountBySubject.get(a.subject_id) ?? 0) === 1 ? "" : "es"}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={ClipboardList} title="Sin asignaturas asignadas" description="Asigna docentes a las asignaturas para poder crear evaluaciones." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "calificaciones" && canGrades && gradeDetail && (
          <CourseSubjectList courseId={id} subjects={gradeDetail.subjects} extraParams={`year=${academicYearId}`} />
        )}

        {tab === "informes" && canInformes && (
          <Card>
            <CardBody>
              {isEnsenanzaBasica(course.level) ? (
                <>
                  <p className="text-sm text-slate-500">Informes académicos disponibles para este curso.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <LinkButton href={`/plataforma/informes/anual/${id}?year=${academicYearId}`} variant="secondary">
                      <FileBarChart className="h-4 w-4" /> Informe Anual
                    </LinkButton>
                    <LinkButton href={`/plataforma/informes/cierre-anio/${id}?year=${academicYearId}`} variant="secondary">
                      <FileBarChart className="h-4 w-4" /> Cierre de Año
                    </LinkButton>
                    <LinkButton href="/plataforma/informes" variant="secondary">
                      <FileBarChart className="h-4 w-4" /> Informe Semestral (elegir período)
                    </LinkButton>
                  </div>
                </>
              ) : (
                <EmptyState icon={FileBarChart} title="No aplica a este curso" description="Los informes académicos aplican solo a Enseñanza Básica (1° a 8° Básico)." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "indicadores" && canGrades && gradeDetail && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Users} label="Matrícula" value={gradeDetail.studentCount} />
            <StatCard
              icon={CheckCircle2}
              label="Asignaturas completas"
              value={`${gradeDetail.subjects.filter((s) => s.status === "completo").length}/${gradeDetail.subjects.length}`}
              tone={gradeDetail.subjects.some((s) => s.status === "pendiente") ? "warning" : "success"}
            />
            <StatCard
              icon={Clock}
              label="Asignaturas pendientes"
              value={gradeDetail.subjects.filter((s) => s.status === "pendiente").length}
              tone={gradeDetail.subjects.some((s) => s.status === "pendiente") ? "warning" : "neutral"}
            />
            <StatCard icon={BarChart3} label="Promedio general" value={courseAverage === null ? "—" : formatGrade(courseAverage)} />
          </div>
        )}
      </div>
    </div>
  );
}
