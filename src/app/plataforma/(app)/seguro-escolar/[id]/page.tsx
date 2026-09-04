import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import {
  getSeguroEscolarDeclaration,
  listDeclarationAttachments,
  listGuardianContacts,
  listDeclarationFollowups,
} from "@/services/seguro-escolar";
import { formatFolio, accidentWeekday, WEEKDAY_LABELS } from "@/features/seguro-escolar/utils";
import {
  SEGURO_ESCOLAR_STATUS_LABELS,
  SEGURO_ESCOLAR_STATUS_TONE,
  SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS,
} from "@/features/seguro-escolar/labels";
import { DeclarationActionsMenu } from "@/features/seguro-escolar/DeclarationActionsMenu";
import { SectionDPanel } from "@/features/seguro-escolar/SectionDPanel";
import { SeguroEscolarAttachmentsPanel } from "@/features/seguro-escolar/SeguroEscolarAttachmentsPanel";
import { GuardianContactsPanel } from "@/features/seguro-escolar/GuardianContactsPanel";
import { FollowupsPanel } from "@/features/seguro-escolar/FollowupsPanel";
import { CaseTabs, type CaseTab } from "@/features/convivencia/CaseTabs";

export const metadata: Metadata = { title: "Declaración — Seguro Escolar" };

const MANAGE_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function DeclaracionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const session = await getSessionContext();
  const canManage = canWrite(session?.roles ?? [], [...MANAGE_ROLES]);

  if (!canManage) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Seguro Escolar</h1>
        <div className="mt-6">
          <EmptyState icon={ShieldAlert} title="Sin acceso" description="No tienes permiso para ver este expediente." />
        </div>
      </div>
    );
  }

  const declaration = await getSeguroEscolarDeclaration(id);
  if (!declaration) notFound();

  const [attachments, contacts, followups] = await Promise.all([
    listDeclarationAttachments(id),
    listGuardianContacts(id),
    listDeclarationFollowups(id),
  ]);

  const weekday = accidentWeekday(declaration.accident_date);

  const tabs: CaseTab[] = [
    {
      key: "resumen",
      label: "Resumen",
      content: (
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">A. Individualización del establecimiento</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-slate-400">Curso</dt><dd className="text-slate-800">{declaration.course_label}</dd></div>
                <div><dt className="text-xs text-slate-400">Horario</dt><dd className="text-slate-800">{declaration.schedule ?? "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Fecha registro</dt><dd className="text-slate-800">{formatDate(declaration.registration_date)}</dd></div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">B. Individualización del accidentado</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-slate-400">Apellido paterno</dt><dd className="text-slate-800">{declaration.student_last_name_paterno ?? "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Apellido materno</dt><dd className="text-slate-800">{declaration.student_last_name_materno ?? "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Nombres</dt><dd className="text-slate-800">{declaration.student_first_names}</dd></div>
                <div><dt className="text-xs text-slate-400">Sexo</dt><dd className="text-slate-800">{declaration.student_sex === "M" ? "Masculino (1)" : declaration.student_sex === "F" ? "Femenino (2)" : "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Año nacimiento</dt><dd className="text-slate-800">{declaration.student_birth_year ?? "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Edad</dt><dd className="text-slate-800">{declaration.student_age ?? "—"}</dd></div>
              </dl>
              <div className="pt-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Residencia habitual</p>
                <p className="text-sm text-slate-800">
                  {[declaration.residence_street, declaration.residence_number].filter(Boolean).join(" ") || "—"}
                  {declaration.residence_population && ` · ${declaration.residence_population}`}
                  {declaration.residence_commune && ` · ${declaration.residence_commune}`}
                  {declaration.residence_city && ` · ${declaration.residence_city}`}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">C. Informe sobre el accidente</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-slate-400">Fecha</dt><dd className="text-slate-800">{formatDate(declaration.accident_date)}</dd></div>
                <div><dt className="text-xs text-slate-400">Hora</dt><dd className="text-slate-800">{declaration.accident_hour ?? "—"}:{String(declaration.accident_minute ?? 0).padStart(2, "0")}</dd></div>
                <div><dt className="text-xs text-slate-400">Día accidente</dt><dd className="text-slate-800">{WEEKDAY_LABELS[weekday]} ({weekday})</dd></div>
                <div><dt className="text-xs text-slate-400">Accidente</dt><dd className="text-slate-800">{SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS[declaration.accident_type]}</dd></div>
              </dl>
              {declaration.accident_type === "trayecto" && (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">Testigo A</p>
                    <p className="text-slate-800">{[declaration.witness_a_name, declaration.witness_a_lastname].filter(Boolean).join(" ") || "—"} {declaration.witness_a_id && `· ${declaration.witness_a_id}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Testigo B</p>
                    <p className="text-slate-800">{[declaration.witness_b_name, declaration.witness_b_lastname].filter(Boolean).join(" ") || "—"} {declaration.witness_b_id && `· ${declaration.witness_b_id}`}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Circunstancia del accidente</p>
                <p className="whitespace-pre-wrap text-sm text-slate-800">{declaration.circumstance}</p>
              </div>
            </CardBody>
          </Card>

          {declaration.status === "anulado" && declaration.annulled_reason && (
            <Card>
              <CardBody>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Declaración anulada</p>
                <p className="mt-1 text-sm text-slate-700">{declaration.annulled_reason}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {declaration.annulledByName} · {declaration.annulled_at ? formatDate(declaration.annulled_at) : "—"}
                </p>
              </CardBody>
            </Card>
          )}

          <SectionDPanel declaration={declaration} canManage={canManage} />
        </div>
      ),
    },
    {
      key: "documentos",
      label: "Documentos",
      content: <SeguroEscolarAttachmentsPanel declarationId={declaration.id} canManage={canManage} attachments={attachments} />,
    },
    {
      key: "contacto",
      label: "Contacto apoderado",
      content: <GuardianContactsPanel declarationId={declaration.id} canManage={canManage} contacts={contacts} suggestedName={null} />,
    },
    {
      key: "seguimiento",
      label: "Seguimiento",
      content: <FollowupsPanel declarationId={declaration.id} canManage={canManage} followups={followups} />,
    },
  ];

  return (
    <div>
      <Link href="/plataforma/seguro-escolar" className="text-xs font-medium text-brand-700 hover:underline">
        ← Seguro Escolar
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg font-semibold text-slate-900">
            Declaración N.º {formatFolio(declaration.folio_year, declaration.folio_number)}
          </h1>
          <p className="text-sm text-slate-500">{declaration.studentName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={SEGURO_ESCOLAR_STATUS_TONE[declaration.status]}>{SEGURO_ESCOLAR_STATUS_LABELS[declaration.status]}</Badge>
          <DeclarationActionsMenu declaration={declaration} canManage={canManage} autoOpenEdit={edit === "1"} />
        </div>
      </div>

      <Card className="mt-4">
        <CardBody>
          <CaseTabs tabs={tabs} />
        </CardBody>
      </Card>
    </div>
  );
}
