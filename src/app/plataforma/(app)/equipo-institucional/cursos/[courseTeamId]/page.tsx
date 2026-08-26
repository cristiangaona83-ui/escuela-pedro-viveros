import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { CourseTeamForm } from "@/features/team/CourseTeamForm";
import { PersonRoleForm } from "@/features/team/PersonRoleForm";
import { RemovePhotoButton } from "@/features/team/RemovePhotoButton";
import { DeleteLinkButton } from "@/features/team/DeleteLinkButton";
import { getCourseTeamAdmin, listAllStaffMembers } from "@/services/staff-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar curso — Equipo institucional" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;
const LIST_HREF = "/plataforma/equipo-institucional/cursos";

export default async function EditarCursoEquipoPage({ params }: { params: Promise<{ courseTeamId: string }> }) {
  const { courseTeamId } = await params;
  const [course, people, session] = await Promise.all([
    getCourseTeamAdmin(courseTeamId),
    listAllStaffMembers(),
    getSessionContext(),
  ]);

  if (!course) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect(LIST_HREF);

  const jefe = course.members.find((m) => m.role === "jefe");
  const asistente = course.members.find((m) => m.role === "asistente");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{course.course_name}</h1>
          <DeleteLinkButton
            table="course_team"
            id={course.id}
            label={course.course_name}
            auditModule="equipo-institucional"
            confirmMessage={`¿Eliminar el curso "${course.course_name}" de la página pública de Docentes y Asistentes? También se quitan las asignaciones de jefatura y asistente de este curso.`}
            redirectTo={LIST_HREF}
          />
        </div>
        <Card className="mt-4">
          <CardBody>
            <CourseTeamForm item={course} redirectTo={LIST_HREF} />
          </CardBody>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Docente de jefatura</h2>
        <Card className="mt-3">
          <CardBody className="space-y-4">
            {jefe?.staff_member.photo_url && (
              <RemovePhotoButton staffMemberId={jefe.staff_member.id} photoUrl={jefe.staff_member.photo_url} fullName={jefe.staff_member.full_name} />
            )}
            <PersonRoleForm
              target={{ kind: "course_role", courseTeamId: course.id, role: "jefe" }}
              existingPeople={people}
              redirectTo={`${LIST_HREF}/${course.id}`}
              auditModule="equipo-institucional"
              editing={
                jefe
                  ? {
                      linkId: jefe.id,
                      staffMemberId: jefe.staff_member.id,
                      fullName: jefe.staff_member.full_name,
                      photoUrl: jefe.staff_member.photo_url,
                      roleTitle: jefe.role_title,
                      category: null,
                      orderIndex: 0,
                      active: true,
                    }
                  : undefined
              }
            />
          </CardBody>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Asistente de Aula</h2>
          {asistente && (
            <DeleteLinkButton
              table="course_role"
              id={asistente.id}
              label={asistente.staff_member.full_name}
              auditModule="equipo-institucional"
              confirmMessage={`¿Quitar a ${asistente.staff_member.full_name} como asistente de aula de ${course.course_name}?`}
            />
          )}
        </div>
        <Card className="mt-3">
          <CardBody className="space-y-4">
            {asistente?.staff_member.photo_url && (
              <RemovePhotoButton
                staffMemberId={asistente.staff_member.id}
                photoUrl={asistente.staff_member.photo_url}
                fullName={asistente.staff_member.full_name}
              />
            )}
            <PersonRoleForm
              target={{ kind: "course_role", courseTeamId: course.id, role: "asistente" }}
              existingPeople={people}
              redirectTo={`${LIST_HREF}/${course.id}`}
              auditModule="equipo-institucional"
              editing={
                asistente
                  ? {
                      linkId: asistente.id,
                      staffMemberId: asistente.staff_member.id,
                      fullName: asistente.staff_member.full_name,
                      photoUrl: asistente.staff_member.photo_url,
                      roleTitle: asistente.role_title,
                      category: null,
                      orderIndex: 0,
                      active: true,
                    }
                  : undefined
              }
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
