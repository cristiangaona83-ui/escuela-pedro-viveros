import type { Metadata } from "next";
import Link from "next/link";
import { Plus, School } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { listCourses } from "@/services/courses";

export const metadata: Metadata = { title: "Cursos" };

export default async function CursosPlataformaPage() {
  const courses = await listCourses();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cursos</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de niveles, jefaturas y asignaciones docentes.</p>
        </div>
        <LinkButton href="/plataforma/cursos/nuevo">
          <Plus className="h-4 w-4" /> Nuevo curso
        </LinkButton>
      </div>

      <div className="mt-6">
        {courses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const year = (c as unknown as { academic_years: { year: number } | null }).academic_years?.year;
              const teacher = (c as unknown as { profiles: { full_name: string } | null }).profiles?.full_name;
              return (
                <Link key={c.id} href={`/plataforma/cursos/${c.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                          <School className="h-5 w-5" />
                        </span>
                        {year && <Badge tone="neutral">{year}</Badge>}
                      </div>
                      <h3 className="mt-3 font-semibold text-slate-900">
                        {c.level} {c.letter}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{teacher ?? "Sin profesor jefe asignado"}</p>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={School} title="Sin cursos creados" description="Crea el primer curso para comenzar a matricular estudiantes y asignar docentes." />
        )}
      </div>
    </div>
  );
}
