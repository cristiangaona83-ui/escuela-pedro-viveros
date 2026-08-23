import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, BookOpen } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCourse } from "@/services/courses";

export const metadata: Metadata = { title: "Detalle del curso" };

interface EnrollmentJoin {
  id: string;
  status: string;
  students: { id: string; first_names: string; last_names: string; run: string } | null;
}
interface AssignmentJoin {
  id: string;
  subjects: { name: string } | null;
  profiles: { full_name: string } | null;
}

export default async function CursoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  const enrollments = (course as unknown as { enrollments: EnrollmentJoin[] }).enrollments ?? [];
  const assignments = (course as unknown as { teacher_assignments: AssignmentJoin[] }).teacher_assignments ?? [];
  const teacherName = (course as unknown as { profiles: { full_name: string } | null }).profiles?.full_name;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{course.level} {course.letter}</h1>
      <p className="mt-1 text-sm text-slate-500">Profesor jefe: {teacherName ?? "Sin asignar"}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-700" />
              <h2 className="font-semibold text-slate-900">Estudiantes matriculados</h2>
            </div>
            <div className="mt-4">
              {enrollments.filter((e) => e.status === "activa").length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {enrollments.filter((e) => e.status === "activa").map((e) => (
                    <li key={e.id} className="py-2.5 text-sm">
                      <Link href={`/plataforma/estudiantes/${e.students?.id}`} className="font-medium text-brand-700 hover:underline">
                        {e.students?.last_names}, {e.students?.first_names}
                      </Link>
                      <span className="ml-2 text-slate-400">{e.students?.run}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Sin estudiantes matriculados aún.</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-700" />
              <h2 className="font-semibold text-slate-900">Asignaturas y docentes</h2>
            </div>
            <div className="mt-4">
              {assignments.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-700">{a.subjects?.name}</span>
                      <Badge tone="brand">{a.profiles?.full_name ?? "Sin asignar"}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={BookOpen} title="Sin asignaturas asignadas" description="Asigna docentes a las asignaturas desde Cursos → Carga docente." />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
