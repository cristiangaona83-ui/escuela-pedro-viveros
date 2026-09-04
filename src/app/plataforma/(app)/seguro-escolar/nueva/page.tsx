import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Folder, FolderOpen as FolderOpenIcon, ShieldAlert, Users } from "lucide-react";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import {
  resolveStudentForDeclaration,
  listActiveCoursesForDeclaration,
  listCourseStudentsForDeclaration,
} from "@/services/seguro-escolar";
import { NewDeclarationForm } from "@/features/seguro-escolar/NewDeclarationForm";

export const metadata: Metadata = { title: "Nueva Declaración — Seguro Escolar" };

const MANAGE_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function NuevaDeclaracionPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; studentId?: string; q?: string }>;
}) {
  const { course, studentId, q } = await searchParams;
  const session = await getSessionContext();
  const allowed = canWrite(session?.roles ?? [], [...MANAGE_ROLES]);

  if (!allowed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Seguro Escolar</h1>
        <div className="mt-6">
          <EmptyState icon={ShieldAlert} title="Sin acceso" description="No tienes permiso para registrar declaraciones de accidente escolar." />
        </div>
      </div>
    );
  }

  // Paso 3: estudiante ya elegido -- precarga y muestra el formulario.
  if (studentId) {
    const student = await resolveStudentForDeclaration(studentId);
    return (
      <div className="mx-auto max-w-3xl">
        <Link href={`/plataforma/seguro-escolar/nueva?course=${course ?? ""}`} className="text-xs font-medium text-brand-700 hover:underline">
          ← Volver al curso
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nueva Declaración de Accidente Escolar</h1>
        <p className="mt-1 text-sm text-slate-500">Formulario 0374-3 — Declaración Individual de Accidente Escolar.</p>
        <div className="mt-6">
          {student ? (
            <NewDeclarationForm student={student} userId={session!.userId} />
          ) : (
            <EmptyState icon={ShieldAlert} title="Estudiante no encontrado" description="Vuelve a intentar la selección." />
          )}
        </div>
      </div>
    );
  }

  // Paso 2: curso elegido -- lista de estudiantes con matrícula vigente.
  if (course) {
    const students = await listCourseStudentsForDeclaration(course, q || undefined);
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/plataforma/seguro-escolar/nueva" className="text-xs font-medium text-brand-700 hover:underline">
          ← Todos los cursos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Seleccione un estudiante</h1>
        <p className="mt-1 text-sm text-slate-500">Estudiantes con matrícula vigente. Al seleccionar uno se precargan sus datos.</p>

        <Card className="mt-4">
          <CardBody>
            <form className="flex gap-2">
              <input type="hidden" name="course" value={course} />
              <Input name="q" defaultValue={q ?? ""} placeholder="Buscar dentro de este curso por nombre o apellido…" className="flex-1" />
              <button type="submit" className="rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Buscar
              </button>
            </form>

            {students.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {students.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/plataforma/seguro-escolar/nueva?course=${course}&studentId=${s.id}`}
                      className="flex items-center justify-between gap-3 px-2 py-2.5 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {s.last_names}, {s.first_names}
                      </span>
                      <span className="text-xs text-slate-400">{s.run}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState icon={Users} title="Sin estudiantes" description="No hay estudiantes con matrícula vigente que coincidan." />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // Paso 1: elegir curso.
  const courses = await listActiveCoursesForDeclaration();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/plataforma/seguro-escolar" className="text-xs font-medium text-brand-700 hover:underline">
        ← Seguro Escolar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nueva Declaración de Accidente Escolar</h1>
      <p className="mt-1 text-sm text-slate-500">Seleccione un curso para elegir al estudiante.</p>

      {courses.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {courses.map((c) => (
            <Link key={c.id} href={`/plataforma/seguro-escolar/nueva?course=${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardBody className="flex flex-col items-center gap-1.5 py-4 text-center">
                  <Folder className="h-6 w-6 text-brand-600" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-slate-900">{c.courseLabel}</span>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState icon={FolderOpenIcon} title="Sin cursos vigentes" description="No hay cursos activos en el año académico actual." />
        </div>
      )}
    </div>
  );
}
