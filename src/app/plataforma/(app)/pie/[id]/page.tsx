import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { PieRecordForm } from "@/features/pie/PieRecordForm";
import { getPieRecord, listPieTeamOptions } from "@/services/pie-records";
import { listStudents } from "@/services/students";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar registro PIE" };

const ALLOWED_ROLES = [
  "pie", "director", "utp", "superadmin",
  "educadora_diferencial", "psicopedagoga", "fonoaudiologa", "psicologo",
] as const;

export default async function EditarPieRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/dashboard");

  const [record, students, teamRows] = await Promise.all([getPieRecord(id), listStudents(), listPieTeamOptions()]);
  if (!record) notFound();

  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.last_names}, ${s.first_names}${s.course_label ? ` — ${s.course_label}` : ""}`,
  }));
  const professionalOptions = teamRows
    .map((r) => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar registro PIE</h1>
      <p className="mt-1 text-xs text-slate-400">
        Creado el {formatDate(record.created_at, { day: "2-digit", month: "long", year: "numeric" })}
        {record.updated_at !== record.created_at &&
          ` · Actualizado el ${formatDate(record.updated_at, { day: "2-digit", month: "long", year: "numeric" })}`}
      </p>
      <Card className="mt-6">
        <CardBody>
          <PieRecordForm
            record={record}
            studentOptions={studentOptions}
            professionalOptions={professionalOptions}
            currentUserId={session?.userId}
            roles={session?.roles}
          />
        </CardBody>
      </Card>
    </div>
  );
}
