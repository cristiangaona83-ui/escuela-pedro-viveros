import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { getSituation } from "@/services/convivencia";
import { ConvertToCaseButton } from "@/features/convivencia/ConvertToCaseButton";
import { SituationActionsMenu } from "@/features/convivencia/SituationActionsMenu";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { SITUATION_STATUS_LABELS, SITUATION_STATUS_TONE } from "@/features/convivencia/labels";

export const metadata: Metadata = { title: "Situación — Convivencia Educativa" };

const CASE_WRITE_ROLES = ["director", "superadmin", "convivencia"] as const;

export default async function SituacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [situation, session] = await Promise.all([getSituation(id), getSessionContext()]);
  if (!situation) notFound();

  const allowedToConvert = canWrite(session?.roles ?? [], [...CASE_WRITE_ROLES]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/plataforma/convivencia/situaciones" className="text-xs font-medium text-brand-700 hover:underline">
        ← Situaciones
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Situación · {formatDate(situation.occurred_on)}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{situation.case_type_label}</Badge>
            <Badge tone={SITUATION_STATUS_TONE[situation.status]}>{SITUATION_STATUS_LABELS[situation.status]}</Badge>
            {situation.needs_followup && <Badge tone="warning">Necesita seguimiento</Badge>}
            {situation.needs_protocol && <Badge tone="danger">Necesita protocolo</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {situation.case_id ? (
            <LinkButton href={`/plataforma/convivencia/casos/${situation.case_id}`} size="sm" variant="secondary">
              Ver Caso
            </LinkButton>
          ) : (
            allowedToConvert &&
            situation.status !== "archivado" && (
              <ConvertToCaseButton
                situationId={situation.id}
                caseTypeId={situation.case_type_id}
                caseTypeLabel={situation.case_type_label}
                occurredOn={formatDate(situation.occurred_on)}
              />
            )
          )}
          <SituationActionsMenu situation={situation} canManage={allowedToConvert} redirectAfterDeleteTo="/plataforma/convivencia/situaciones" />
        </div>
      </div>

      <Card className="mt-4">
        <CardBody className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estudiante(s)</p>
            <p className="mt-1 text-sm text-slate-800">
              {situation.students.map((s) => `${s.student.last_names}, ${s.student.first_names} (${s.courseLabel ?? "sin curso"})`).join(" · ") || "—"}
            </p>
          </div>
          {situation.location && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lugar</p>
              <p className="mt-1 text-sm text-slate-800">{situation.location}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descripción</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{situation.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reportado por</p>
            <p className="mt-1 text-sm text-slate-800">{situation.reported_by_name}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
