import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { PersonRoleForm } from "@/features/team/PersonRoleForm";
import { RemovePhotoButton } from "@/features/team/RemovePhotoButton";
import { DeleteLinkButton } from "@/features/team/DeleteLinkButton";
import { getSectionMembership, listAllStaffMembers } from "@/services/staff-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar — Equipo PIE" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;
const LIST_HREF = "/plataforma/equipo-institucional/pie";

export default async function EditarPiePage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const [membership, people, session] = await Promise.all([
    getSectionMembership(membershipId),
    listAllStaffMembers(),
    getSessionContext(),
  ]);

  if (!membership || membership.section !== "pie") notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect(LIST_HREF);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Editar — {membership.staff_member.full_name}</h1>
        <DeleteLinkButton
          table="membership"
          id={membership.id}
          label={membership.staff_member.full_name}
          auditModule="equipo-institucional"
          confirmMessage={`¿Quitar a ${membership.staff_member.full_name} de Equipo PIE? Su registro se mantiene si aparece en otra sección.`}
        />
      </div>
      <Card className="mt-6">
        <CardBody className="space-y-4">
          {membership.staff_member.photo_url && (
            <RemovePhotoButton
              staffMemberId={membership.staff_member.id}
              photoUrl={membership.staff_member.photo_url}
              fullName={membership.staff_member.full_name}
            />
          )}
          <PersonRoleForm
            target={{ kind: "membership", section: "pie" }}
            existingPeople={people}
            redirectTo={LIST_HREF}
            auditModule="equipo-institucional"
            editing={{
              linkId: membership.id,
              staffMemberId: membership.staff_member.id,
              fullName: membership.staff_member.full_name,
              photoUrl: membership.staff_member.photo_url,
              roleTitle: membership.role_title,
              category: membership.category,
              orderIndex: membership.order_index,
              active: membership.active,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
