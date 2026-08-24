import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { PersonRoleForm } from "@/features/team/PersonRoleForm";
import { RemovePhotoButton } from "@/features/team/RemovePhotoButton";
import { DeleteLinkButton } from "@/features/team/DeleteLinkButton";
import { getSubjectTeacherAdmin, listAllStaffMembers } from "@/services/staff-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar — Docentes de Asignatura" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;
const LIST_HREF = "/plataforma/equipo-institucional/cursos/asignatura";

export default async function EditarAsignaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, people, session] = await Promise.all([
    getSubjectTeacherAdmin(id),
    listAllStaffMembers(),
    getSessionContext(),
  ]);

  if (!item) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect(LIST_HREF);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Editar — {item.staff_member.full_name}</h1>
        <DeleteLinkButton
          table="subject_teacher"
          id={item.id}
          label={item.staff_member.full_name}
          auditModule="equipo-institucional"
          confirmMessage={`¿Quitar a ${item.staff_member.full_name} de Docentes de Asignatura?`}
          redirectTo={LIST_HREF}
        />
      </div>
      <Card className="mt-6">
        <CardBody className="space-y-4">
          {item.staff_member.photo_url && (
            <RemovePhotoButton
              staffMemberId={item.staff_member.id}
              photoUrl={item.staff_member.photo_url}
              fullName={item.staff_member.full_name}
            />
          )}
          <PersonRoleForm
            target={{ kind: "subject_teacher" }}
            existingPeople={people}
            redirectTo={LIST_HREF}
            auditModule="equipo-institucional"
            editing={{
              linkId: item.id,
              staffMemberId: item.staff_member.id,
              fullName: item.staff_member.full_name,
              photoUrl: item.staff_member.photo_url,
              roleTitle: item.role_title,
              category: null,
              orderIndex: item.order_index,
              active: item.active,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
