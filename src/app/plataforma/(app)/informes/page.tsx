import type { Metadata } from "next";
import Link from "next/link";
import { FileBarChart, AlertTriangle, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { listAcademicYears, getActiveAcademicYear, levelSortIndex } from "@/services/courses";
import { listOpenPeriods } from "@/services/academic-scope";
import { isEnsenanzaBasica } from "@/lib/pdf/academic-certificate-wording";
import { InformesFilterBar } from "@/features/reports/InformesFilterBar";

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
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const [academicYears, activeYear, allPeriods] = await Promise.all([listAcademicYears(), getActiveAcademicYear(), listOpenPeriods()]);

  const selectedYearId = sp.year || activeYear?.id || academicYears[0]?.id || "";
  const yearPeriods = allPeriods.filter((p) => p.academic_year_id === selectedYearId);
  const selectedPeriodId = sp.period || yearPeriods[0]?.id || "";

  const courses = selectedYearId ? await getEnsenanzaBasicaCourses(selectedYearId) : [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <FileBarChart className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Informes</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Informes de calificaciones organizados por curso. Aplican solo a Enseñanza Básica (1° a 8° Básico).
      </p>

      <div className="mt-6">
        <InformesFilterBar academicYears={academicYears} periods={yearPeriods} year={selectedYearId} period={selectedPeriodId} />
      </div>

      {!selectedYearId ? (
        <div className="mt-6">
          <EmptyState icon={FileBarChart} title="Sin años académicos registrados" />
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
