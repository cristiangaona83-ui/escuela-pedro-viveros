import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, ShieldAlert } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import { PieRecordForm } from "@/features/pie/PieRecordForm";
import { listPieRecords, listPieTeamOptions } from "@/services/pie-records";
import { listStudents } from "@/services/students";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import type { PieRecordRow } from "@/types/database";

export const metadata: Metadata = { title: "PIE" };

const STATUS_TONE = { activo: "success", en_evaluacion: "warning", egresado: "neutral" } as const;
const STATUS_LABEL = { activo: "Activo", en_evaluacion: "En evaluación", egresado: "Egresado" } as const;
const ALLOWED_ROLES = ["pie", "director", "utp", "superadmin"] as const;

export default async function PiePage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/dashboard");

  const { estado } = await searchParams;
  const status = estado && estado in STATUS_LABEL ? (estado as PieRecordRow["status"]) : undefined;

  const [records, students, teamRows] = await Promise.all([
    listPieRecords({ status }),
    listStudents(),
    listPieTeamOptions(),
  ]);

  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.last_names}, ${s.first_names}${s.course_label ? ` — ${s.course_label}` : ""}`,
  }));
  const professionalOptions = teamRows
    .map((r) => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p));

  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Módulo de acceso estrictamente restringido a Equipo PIE, UTP, Dirección y Superadmin. La información nunca se expone públicamente.
      </div>

      <h1 className="text-2xl font-semibold text-slate-900">Programa de Integración Escolar</h1>
      <p className="mt-1 text-sm text-slate-500">Estudiantes asociados, profesionales responsables, apoyos y seguimiento individual.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
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
                    <Link href={`/plataforma/pie/${r.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {r.students ? `${r.students.last_names}, ${r.students.first_names}` : "—"}
                        </p>
                        <p className="text-xs text-slate-500">{r.support_type || "Sin tipo de apoyo registrado"}</p>
                      </div>
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={HeartHandshake} title="Sin registros PIE" description="Registra el primer estudiante en el programa." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Nuevo registro</h2>
            <div className="mt-4">
              <PieRecordForm studentOptions={studentOptions} professionalOptions={professionalOptions} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
