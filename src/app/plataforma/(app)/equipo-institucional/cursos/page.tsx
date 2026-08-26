import type { Metadata } from "next";
import Link from "next/link";
import { School, Pencil, BookOpen } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { CourseTeamForm } from "@/features/team/CourseTeamForm";
import { listCourseTeamsAdmin, listSubjectTeachersAdmin } from "@/services/staff-admin";
// La visibilidad de cada curso/docente de asignatura se edita en su propia
// página ([courseTeamId] / asignatura) -- esta vista es solo un resumen.
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Docentes y Asistentes — Equipo institucional" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function CursosEquipoAdminPage() {
  const [courses, subjectTeachers, session] = await Promise.all([
    listCourseTeamsAdmin(),
    listSubjectTeachersAdmin(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Docentes y Asistentes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Profesor(a) jefe, asistente de aula y docentes de asignatura mostrados en la página pública de Docentes y Asistentes.
      </p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            {courses.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {courses.map((c) => {
                  const jefe = c.members.find((m) => m.role === "jefe");
                  const asistente = c.members.find((m) => m.role === "asistente");
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{c.course_name}</p>
                        <p className="text-xs text-slate-500">
                          {jefe ? jefe.staff_member.full_name : "Sin docente de jefatura"}
                          {asistente && ` · Asistente: ${asistente.staff_member.full_name}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Visible" : "Oculto"}</Badge>
                        {allowedToWrite && (
                          <Link
                            href={`/plataforma/equipo-institucional/cursos/${c.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${c.course_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={School} title="Sin cursos" description="Crea el primer curso." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nuevo curso</h2>
              <div className="mt-4">
                <CourseTeamForm redirectTo="/plataforma/equipo-institucional/cursos" />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Docentes de Asignatura</h2>
          <p className="mt-1 text-sm text-slate-500">Lista global, no atada a un curso en particular.</p>
        </div>
        {allowedToWrite && (
          <LinkButton href="/plataforma/equipo-institucional/cursos/asignatura" variant="secondary" size="sm">
            Administrar
          </LinkButton>
        )}
      </div>

      <Card className="mt-4">
        <CardBody>
          {subjectTeachers.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {subjectTeachers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{s.staff_member.full_name}</p>
                    <p className="text-xs text-slate-500">{s.role_title}</p>
                  </div>
                  <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Visible" : "Oculto"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={BookOpen} title="Sin docentes de asignatura" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
