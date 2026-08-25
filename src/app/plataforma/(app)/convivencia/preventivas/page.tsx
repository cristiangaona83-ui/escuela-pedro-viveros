import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { formatDate } from "@/lib/utils";
import { listPreventiveActions } from "@/services/convivencia";
import { listCourseOptions } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Acciones preventivas — Convivencia Educativa" };

const WRITE_ROLES = ["director", "superadmin", "convivencia"] as const;

export default async function PreventivasPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const [actions, courses, session] = await Promise.all([listPreventiveActions(), listCourseOptions(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  const filtered = course ? actions.filter((a) => a.courseLabels.some((l) => courses.find((c) => c.id === course && `${c.level} ${c.letter}` === l))) : actions;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Talleres, jornadas, mediación y trabajo formativo — no solo registro de conflictos.</p>
        {allowedToWrite && (
          <LinkButton href="/plataforma/convivencia/preventivas/nueva" size="sm">
            + Nueva acción
          </LinkButton>
        )}
      </div>

      <Card className="mt-4">
        <CardBody>
          <form className="flex max-w-sm gap-2">
            <Select name="course" defaultValue={course ?? ""}>
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.level} {c.letter}
                </option>
              ))}
            </Select>
            <button type="submit" className="shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Filtrar
            </button>
          </form>

          {filtered.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {filtered.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{a.activity}</p>
                    <span className="text-xs text-slate-400">{formatDate(a.action_date)}</span>
                  </div>
                  {a.objective && <p className="mt-1 text-xs text-slate-500">{a.objective}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {a.courseLabels.map((l) => (
                      <Badge key={l} tone="brand">
                        {l}
                      </Badge>
                    ))}
                    <span className="text-xs text-slate-400">{a.responsible_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState icon={Sparkles} title="Sin acciones preventivas" description="Registra talleres, jornadas u otras actividades formativas." />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
