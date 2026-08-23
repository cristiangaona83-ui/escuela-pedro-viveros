import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { QuickActionsPanel } from "@/features/students/QuickActionsPanel";
import { listStudents } from "@/services/students";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Estudiantes" };

const STATUS_TONE = { matriculado: "success", retirado: "danger", egresado: "neutral" } as const;
const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;
const QUICK_ACTIONS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

export default async function EstudiantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [students, session] = await Promise.all([listStudents(q), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const showQuickActions = canWrite(session?.roles ?? [], [...QUICK_ACTIONS_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estudiantes</h1>
          <p className="mt-1 text-sm text-slate-500">Información privada — nunca visible desde el sitio público.</p>
        </div>
        {allowedToWrite && (
          <LinkButton href="/plataforma/estudiantes/nuevo">
            <UserPlus className="h-4 w-4" /> Nuevo estudiante
          </LinkButton>
        )}
      </div>

      {showQuickActions && (
        <div className="mt-6">
          <QuickActionsPanel />
        </div>
      )}

      <form className="mt-6 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input id="buscar" name="q" defaultValue={q} placeholder="Buscar por nombre o RUN…" className="pl-9" />
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Estudiante</th>
                  <th className="px-5 py-3">RUN</th>
                  <th className="px-5 py-3">Curso</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/plataforma/estudiantes/${s.id}`} className="font-medium text-brand-700 hover:underline">
                        {s.last_names}, {s.first_names}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{s.run}</td>
                    <td className="px-5 py-3 text-slate-500">{s.course_label ?? "Sin matrícula activa"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Users} title="Sin estudiantes registrados" description="Agrega el primer estudiante para comenzar a gestionar matrículas y calificaciones." />
        )}
      </div>
    </div>
  );
}
