import type { Metadata } from "next";
import Link from "next/link";
import { FileBarChart, AlertTriangle, Users, Baby, ListChecks } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Tabs } from "@/components/ui/Tabs";
import { LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { listAcademicYears, getActiveAcademicYear, levelSortIndex } from "@/services/courses";
import { listOpenPeriods } from "@/services/academic-scope";
import { isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { InformesFilterBar } from "@/features/reports/InformesFilterBar";
import { listParvulariaCourses } from "@/services/parvularia";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

/** Informes de Enseñanza Básica: solo Dirección/UTP/Administrativo. Prebásica también la educadora (ver sus cursos). */
const BASICA_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;
const PARVULARIA_ADMIN_ROLES = ["director", "utp", "superadmin"] as const;

export const metadata: Metadata = { title: "Informes" };

interface CourseCard {
  id: string;
  label: string;
  matricula: number;
}

async function getEnsenanzaBasicaCourses(academicYearId: string): Promise<CourseCard[]> {
  const supabase = await createClient();
  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from("courses").select("id, level, letter").eq("academic_year_id", academicYearId).eq("active", true),
    supabase.from("enrollments").select("course_id").eq("academic_year_id", academicYearId).eq("status", "activa"),
  ]);

  const matriculaByCourse = new Map<string, number>();
  for (const e of enrollments ?? []) matriculaByCourse.set(e.course_id, (matriculaByCourse.get(e.course_id) ?? 0) + 1);

  return (courses ?? [])
    .filter((c) => isEnsenanzaBasica(c.level))
    .sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter))
    .map((c) => ({ id: c.id, label: `${c.level} ${c.letter}`.trim(), matricula: matriculaByCourse.get(c.id) ?? 0 }));
}

function CourseCardGrid({ tipo, courses, extraParams }: { tipo: string; courses: CourseCard[]; extraParams: string }) {
  if (courses.length === 0) {
    return <EmptyState icon={Users} title="Sin cursos de Enseñanza Básica" description="Este informe aplica solo a 1° a 8° Básico." />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {courses.map((c) => (
        <Link key={c.id} href={`/plataforma/informes/${tipo}/${c.id}?${extraParams}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardBody className="flex flex-col items-center gap-1 py-4 text-center">
              <span className="text-sm font-semibold text-slate-900">{c.label}</span>
              <span className="text-xs text-slate-500">{c.matricula} estudiante{c.matricula === 1 ? "" : "s"}</span>
              <span className="mt-1 text-[11px] font-medium text-brand-700">Ver curso</span>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string; nivel?: string }>;
}) {
  const sp = await searchParams;
  const [academicYears, activeYear, allPeriods] = await Promise.all([listAcademicYears(), getActiveAcademicYear(), listOpenPeriods("all")]);

  const selectedYearId = sp.year || activeYear?.id || academicYears[0]?.id || "";
  const yearPeriods = allPeriods.filter((p) => p.academic_year_id === selectedYearId);
  const selectedPeriodId = sp.period || yearPeriods[0]?.id || "";

  const session = await getSessionContext();
  const roles = session?.roles ?? [];
  const canBasica = canWrite(roles, [...BASICA_ROLES]);
  const canAdminParvularia = canWrite(roles, [...PARVULARIA_ADMIN_ROLES]);
  // Sin acceso a Básica (ej. educadora), se entra directo a Prebásica.
  const nivel = canBasica && sp.nivel !== "prebasica" ? "basica" : "prebasica";

  const courses = selectedYearId && nivel === "basica" ? await getEnsenanzaBasicaCourses(selectedYearId) : [];
  const parvulariaCourses = selectedYearId && nivel === "prebasica" ? await listParvulariaCourses(selectedYearId) : [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Gestión Pedagógica", href: "/plataforma/areas/utp" }, { label: "Informes" }]} />
      <div className="mt-2 flex items-center gap-3">
        <FileBarChart className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Informes</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Informes organizados por curso: calificaciones para Enseñanza Básica (1° a 8° Básico) e informes pedagógicos para Educación Parvularia (Prekínder y Kínder).
      </p>

      {canBasica && (
        <div className="mt-6">
          <Tabs
            basePath="/plataforma/informes"
            paramName="nivel"
            tabs={[
              { key: "basica", label: "Informes de Básica" },
              { key: "prebasica", label: "Informes de Prebásica" },
            ]}
            active={nivel}
            extraParams={{ year: sp.year, period: sp.period }}
          />
        </div>
      )}

      <div className="mt-6">
        <InformesFilterBar academicYears={academicYears} periods={yearPeriods} year={selectedYearId} period={selectedPeriodId} showPeriod={nivel === "basica"} />
      </div>

      {!selectedYearId ? (
        <div className="mt-6">
          <EmptyState icon={FileBarChart} title="Sin años académicos registrados" />
        </div>
      ) : nivel === "prebasica" ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Baby className="h-5 w-5 text-brand-700" /> Informe Pedagógico de Educación Parvularia
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Evaluación conceptual (L, ML, PL, N/O) por indicador y semestre, para Prekínder y Kínder.
              </p>
            </div>
            {canAdminParvularia && (
              <LinkButton href="/plataforma/informes/parvularia/indicadores" variant="secondary" size="sm">
                <ListChecks className="h-4 w-4" /> Administrar indicadores
              </LinkButton>
            )}
          </div>
          <div className="mt-4">
            {parvulariaCourses.length === 0 ? (
              <EmptyState
                icon={Baby}
                title="Sin cursos de Prekínder o Kínder"
                description={canBasica ? "No hay cursos de Educación Parvularia activos este año." : "No tienes cursos de Prekínder o Kínder asignados este año."}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {parvulariaCourses.map((c) => (
                  <Link key={c.id} href={`/plataforma/informes/parvularia/${c.id}?year=${selectedYearId}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardBody className="flex flex-col items-center gap-1 py-4 text-center">
                        <span className="text-sm font-semibold text-slate-900">{c.label}</span>
                        <span className="text-xs text-slate-500">{c.matricula} niño{c.matricula === 1 ? "" : "s"}(as)</span>
                        <span className="mt-1 text-[11px] font-medium text-brand-700">Ver curso</span>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Informe Semestral</h2>
            <p className="mt-1 text-xs text-slate-500">Resultados del período seleccionado arriba.</p>
            <div className="mt-4">
              {selectedPeriodId ? (
                <CourseCardGrid tipo="semestral" courses={courses} extraParams={`year=${selectedYearId}&period=${selectedPeriodId}`} />
              ) : (
                <EmptyState icon={FileBarChart} title="Sin períodos configurados para este año" />
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Informe Anual</h2>
            <p className="mt-1 text-xs text-slate-500">Resultados finales del año académico completo.</p>
            <div className="mt-4">
              <CourseCardGrid tipo="anual" courses={courses} extraParams={`year=${selectedYearId}`} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Informe de Cierre de Año</h2>
            <p className="mt-1 text-xs text-slate-500">Situación final del estudiante al término del año.</p>
            <div className="mt-4">
              <CourseCardGrid tipo="cierre-anio" courses={courses} extraParams={`year=${selectedYearId}`} />
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No reemplaza el Certificado Anual de Estudios oficial emitido por el MINEDUC.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
