import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { formatDate } from "@/lib/utils";
import { SupportForm } from "@/features/pedagogical-support/SupportForm";
import { listSupportRecords } from "@/services/pedagogical-support";
import { listStudents } from "@/services/students";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import type { StudentSupportRow } from "@/types/database";

export const metadata: Metadata = { title: "Seguimiento Pedagógico" };

const STATUS_TONE = { en_seguimiento: "warning", resuelto: "success", derivado: "neutral" } as const;
const STATUS_LABEL = { en_seguimiento: "En seguimiento", resuelto: "Resuelto", derivado: "Derivado" } as const;
const WRITE_ROLES = ["director", "utp", "docente", "convivencia", "superadmin"] as const;

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const status = estado && estado in STATUS_LABEL ? (estado as StudentSupportRow["status"]) : undefined;

  const [records, students, subjectOptions, session] = await Promise.all([
    listSupportRecords({ status }),
    listStudents(),
    listSubjectOptions(),
    getSessionContext(),
  ]);

  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.last_names}, ${s.first_names}${s.course_label ? ` — ${s.course_label}` : ""}`,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Seguimiento Pedagógico</h1>
      <p className="mt-1 text-sm text-slate-500">
        Dificultades, fortalezas, acciones y responsables por estudiante, con seguimiento en el tiempo.
      </p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            <form className="mb-4 flex max-w-sm items-end gap-2">
              <div className="flex-1">
                <Select name="estado" defaultValue={estado ?? ""}>
                  <option value="">Todos los estados</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Filtrar
              </button>
            </form>

            {records.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {records.map((r) => (
                  <li key={r.id} className="py-3">
                    <Link
                      href={allowedToWrite ? `/plataforma/seguimiento/${r.id}` : "#"}
                      className={`flex flex-wrap items-center justify-between gap-2 ${!allowedToWrite ? "pointer-events-none" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {r.students ? `${r.students.last_names}, ${r.students.first_names}` : "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.difficulty || "Sin dificultad registrada"}
                          {r.subjects?.name && ` · ${r.subjects.name}`} · {formatDate(r.event_date)}
                          {r.responsible?.full_name && ` · ${r.responsible.full_name}`}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Activity} title="Sin registros de seguimiento" description="Registra la primera observación pedagógica." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nuevo registro</h2>
              <div className="mt-4">
                <SupportForm studentOptions={studentOptions} subjectOptions={subjectOptions} currentUserId={session!.userId} />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
