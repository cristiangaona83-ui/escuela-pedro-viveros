import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { listProfilesWithRoles, listRoles } from "@/services/users";
import { getSessionContext } from "@/features/auth/session";
import { AssignRoleForm } from "@/features/admin/AssignRoleForm";
import { RevokeRoleButton } from "@/features/admin/RevokeRoleButton";
import { ToggleActiveButton } from "@/features/admin/ToggleActiveButton";

export const metadata: Metadata = { title: "Usuarios y roles" };

export default async function UsuariosPage() {
  const [profiles, roles, session] = await Promise.all([listProfilesWithRoles(), listRoles(), getSessionContext()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Usuarios y roles</h1>
      <p className="mt-1 text-sm text-slate-500">
        Crea las cuentas desde el panel de Supabase (Authentication → Users). Aquí se asignan/revocan roles y se
        activa o desactiva el acceso a la plataforma — sin eliminar la cuenta de Supabase Auth.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardBody>
            {profiles.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {profiles.map((p) => {
                  const isSelf = p.id === session?.userId;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {p.full_name} {!p.active && <Badge tone="danger" className="ml-1.5">Desactivado</Badge>}
                        </p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {p.roles.length > 0 ? (
                            p.roles.map((r) => (
                              <Badge key={r.userRoleId} tone="brand" className="inline-flex items-center">
                                {r.name}
                                <RevokeRoleButton
                                  userRoleId={r.userRoleId}
                                  roleName={r.name}
                                  userName={p.full_name}
                                  isSelf={isSelf}
                                />
                              </Badge>
                            ))
                          ) : (
                            <Badge tone="neutral">Sin rol asignado</Badge>
                          )}
                        </div>
                        <ToggleActiveButton profileId={p.id} active={p.active} fullName={p.full_name} isSelf={isSelf} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Users} title="Sin usuarios" description="Crea el primer usuario desde el panel de Supabase Authentication." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Asignar rol</h2>
            <div className="mt-4">
              <AssignRoleForm profiles={profiles} roles={roles} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
