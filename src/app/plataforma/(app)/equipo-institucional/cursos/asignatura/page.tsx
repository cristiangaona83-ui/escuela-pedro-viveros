import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PersonRoleForm } from "@/features/team/PersonRoleForm";
import { ToggleLinkActiveButton } from "@/features/team/ToggleLinkActiveButton";
import { listSubjectTeachersAdmin, listAllStaffMembers } from "@/services/staff-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Docentes de Asignatura" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;
const LIST_HREF = "/plataforma/equipo-institucional/cursos/asignatura";

export default async function AsignaturaAdminPage() {
  const [items, people, session] = await Promise.all([
    listSubjectTeachersAdmin(),
    listAllStaffMembers(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Docentes de Asignatura</h1>
      <p className="mt-1 text-sm text-slate-500">Lista global mostrada al final de la página pública de Cursos.</p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            {items.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {items.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{s.staff_member.full_name}</p>
                      <p className="text-xs text-slate-500">{s.role_title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Visible" : "Oculto"}</Badge>
                      {allowedToWrite && (
                        <>
                          <Link
                            href={`${LIST_HREF}/${s.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Editar ${s.staff_member.full_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <ToggleLinkActiveButton
                            table="subject_teachers"
                            id={s.id}
                            active={s.active}
                            label={s.staff_member.full_name}
                            auditModule="equipo-institucional"
                          />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={BookOpen} title="Sin docentes de asignatura" description="Agrega el primer docente de asignatura." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Agregar docente de asignatura</h2>
              <div className="mt-4">
                <PersonRoleForm
                  target={{ kind: "subject_teacher" }}
                  existingPeople={people}
                  redirectTo={LIST_HREF}
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
