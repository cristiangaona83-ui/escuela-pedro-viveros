import type { Metadata } from "next";
import { School, UserRound } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody } from "@/components/ui/Card";
import { getPublicCourses } from "@/services/public-content";

export const metadata: Metadata = { title: "Nuestros Cursos" };

export default async function CursosPage() {
  const courses = await getPublicCourses();

  return (
    <>
      <PageHeader
        eyebrow="Cursos"
        title="Nuestros Cursos"
        description="Desde Prekínder a 8° Básico, cada curso cuenta con un docente de jefatura a cargo del acompañamiento formativo."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {courses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardBody>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <School className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">
                    {course.level} {course.letter}
                  </h3>
                  {course.homeroom_teacher?.full_name && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <UserRound className="h-3.5 w-3.5" /> {course.homeroom_teacher.full_name}
                    </p>
                  )}
                  {course.description && <p className="mt-2 text-sm text-slate-500">{course.description}</p>}
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={School}
            title="Cursos en publicación"
            description="La oferta de cursos —desde Prekínder hasta 8° Básico— y sus docentes de jefatura se mostrarán aquí una vez cargados en la plataforma."
          />
        )}
      </section>
    </>
  );
}
