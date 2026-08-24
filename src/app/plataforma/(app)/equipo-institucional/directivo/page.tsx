import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PersonRoleForm } from "@/features/team/PersonRoleForm";
import { ToggleLinkActiveButton } from "@/features/team/ToggleLinkActiveButton";
import { listSectionMemberships, listAllStaffMembers } from "@/services/staff-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Equipo Directivo" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EquipoDirectivoAdminPage() {
  const [items, people, session] = await Promise.all([
    listSectionMemberships("directivo"),
    listAllStaffMembers(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Equipo Directivo</h1>
      <p className="mt-1 text-sm text-slate-500">Administra quién aparece en la página pública de Equipo Directivo.</p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            {items.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {items.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{m.staff_member.full_name}</p>
                      <p className="text-xs text-slate-500">{m.role_title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={m.active ? "success" : "neutral"}>{m.active ? "Visible" : "Oculto"}</Badge>
                      {allowedToWrite && (
                        <>
                          <Link
                            href={`/plataforma/equipo-institucional/directivo/${m.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${m.staff_member.full_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <ToggleLinkActiveButton
                            table="staff_section_memberships"
                            id={m.id}
                            active={m.active}
                            label={m.staff_member.full_name}
                            auditModule="equipo-institucional"
                          />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Landmark} title="Sin integrantes" description="Agrega la primera persona al Equipo Directivo." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Agregar al Equipo Directivo</h2>
              <div className="mt-4">
                <PersonRoleForm
                  target={{ kind: "membership", section: "directivo" }}
                  existingPeople={people}
                  redirectTo="/plataforma/equipo-institucional/directivo"
                  auditModule="equipo-institucional"
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
