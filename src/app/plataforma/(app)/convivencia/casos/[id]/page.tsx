import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MessageSquare, ClipboardCheck, Send, ShieldCheck, CalendarClock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  getCaseDetail,
  listCaseEvents,
  listCaseInterviews,
  listCaseMeasures,
  listCaseReferrals,
  listCaseCommunications,
  listCaseProtocols,
  listCaseAttachments,
  listCaseTypes,
  listProtocols,
  listInspectoriaProfiles,
  listCaseManagerProfiles,
} from "@/services/convivencia";
import { listStudentGuardiansFull } from "@/services/guardians";
import { listAcademicYears } from "@/services/courses";
import { CaseActionsMenu } from "@/features/convivencia/CaseActionsMenu";
import { CaseContentSummary } from "@/features/convivencia/CaseContentSummary";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { CASE_STATUS_LABELS, CASE_STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE, EVENT_TYPE_LABELS, MEASURE_STATUS_LABELS, MEASURE_STATUS_TONE, REFERRAL_TYPE_LABELS, REFERRAL_STATUS_LABELS, COMM_TYPE_LABELS, INTERVIEW_PARTICIPANT_LABELS } from "@/features/convivencia/labels";
import { CaseTabs, type CaseTab } from "@/features/convivencia/CaseTabs";
import { EventForm } from "@/features/convivencia/EventForm";
import { InterviewForm, type GuardianOption } from "@/features/convivencia/InterviewForm";
import { MeasureForm } from "@/features/convivencia/MeasureForm";
import { ReferralForm } from "@/features/convivencia/ReferralForm";
import { CommunicationForm } from "@/features/convivencia/CommunicationForm";
import { FollowupForm } from "@/features/convivencia/FollowupForm";
import { CaseProtocolForm } from "@/features/convivencia/CaseProtocolForm";
import { CaseStatusForm } from "@/features/convivencia/CaseStatusForm";
import { CaseAssignmentForm } from "@/features/convivencia/CaseAssignmentForm";
import { CaseAttachmentsPanel } from "@/features/convivencia/CaseAttachmentsPanel";

export const metadata: Metadata = { title: "Caso — Convivencia Educativa" };

const FULL_ROLES = ["director", "superadmin", "convivencia"] as const;
const ADMIN_ROLES = ["director", "superadmin"] as const;
const OPERATE_ROLES = ["director", "superadmin", "convivencia", "inspectoria_general"] as const;
// Acceso a Actas y documentos: acceso completo (FULL_ROLES) + inspectoria_general
// y psicologo, ambos acotados por RLS a casos donde tienen asignación
// operacional (convivencia_case_assigned) -- este flag solo controla si se
// muestra la pestaña/formularios; el filtrado real de qué casos/filas ve
// cada quien lo hace RLS, no esta comprobación de rol.
const ATTACHMENT_ROLES = ["director", "superadmin", "convivencia", "inspectoria_general", "psicologo"] as const;

export default async function CasoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [caseDetail, session] = await Promise.all([getCaseDetail(id), getSessionContext()]);
  if (!caseDetail) notFound();

  const canManage = canWrite(session?.roles ?? [], [...FULL_ROLES]);
  const isFullAdmin = canWrite(session?.roles ?? [], [...ADMIN_ROLES]);
  const canOperate = canWrite(session?.roles ?? [], [...OPERATE_ROLES]);
  const canViewAttachments = canWrite(session?.roles ?? [], [...ATTACHMENT_ROLES]);

  const guardianLists = await Promise.all(caseDetail.students.map((s) => listStudentGuardiansFull(s.student.id)));
  const guardians: GuardianOption[] = guardianLists.flatMap((list, i) =>
    list.map((g) => ({ id: g.guardian.id, full_name: g.guardian.full_name, studentLabel: `${caseDetail.students[i].student.last_names}, ${caseDetail.students[i].student.first_names}` }))
  );

  const [events, interviews, protocols] = await Promise.all([listCaseEvents(id), listCaseInterviews(id), listProtocols()]);

  const [measures, referrals, communications, caseProtocols, attachments, inspectoria, caseTypes, managers, academicYears] = await Promise.all([
    canManage ? listCaseMeasures(id) : Promise.resolve([]),
    canManage ? listCaseReferrals(id) : Promise.resolve([]),
    listCaseCommunications(id),
    canManage ? listCaseProtocols(id) : Promise.resolve([]),
    canViewAttachments ? listCaseAttachments(id) : Promise.resolve([]),
    canManage ? listInspectoriaProfiles() : Promise.resolve([]),
    canManage ? listCaseTypes() : Promise.resolve([]),
    canManage ? listCaseManagerProfiles() : Promise.resolve([]),
    canManage ? listAcademicYears() : Promise.resolve([]),
  ]);

  const tabs: CaseTab[] = [
    {
      key: "resumen",
      label: "Resumen",
      content: (
        <div className="space-y-4">
          <Card>
            <CardBody className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estudiante(s)</p>
                <p className="mt-1 text-sm text-slate-800">
                  {caseDetail.students.map((s) => `${s.student.last_names}, ${s.student.first_names}`).join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Curso(s)</p>
                <p className="mt-1 text-sm text-slate-800">{Array.from(new Set(caseDetail.students.map((s) => s.courseLabel ?? "—"))).join(", ")}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo</p>
                <p className="mt-1 text-sm text-slate-800">{caseDetail.caseTypeLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responsable</p>
                <p className="mt-1 text-sm text-slate-800">{caseDetail.responsibleName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha de apertura</p>
                <p className="mt-1 text-sm text-slate-800">{formatDate(caseDetail.opened_at)}</p>
              </div>
              {caseDetail.closed_at && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha de cierre</p>
                  <p className="mt-1 text-sm text-slate-800">{formatDate(caseDetail.closed_at)}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {caseDetail.closure && (
            <Card>
              <CardBody>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conclusión</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{caseDetail.closure.conclusion}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Cerrado por {caseDetail.closure.closed_by_name} el {formatDate(caseDetail.closure.closed_at)}
                </p>
              </CardBody>
            </Card>
          )}

          {canManage && (
            <>
              <CaseStatusForm caseId={caseDetail.id} currentStatus={caseDetail.status} />
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-slate-900">Acceso operativo de Inspectoría</h3>
                  <p className="mt-1 text-xs text-slate-500">Sin asignación explícita, Inspectoría General no ve este caso.</p>
                  <div className="mt-3">
                    <CaseAssignmentForm caseId={caseDetail.id} inspectoria={inspectoria} assignments={caseDetail.assignments.map((a) => ({ id: a.id, profile_id: a.profile_id, profile_name: a.profile_name }))} />
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      ),
    },
    {
      key: "timeline",
      label: "Línea de tiempo",
      content: (
        <div className="space-y-4">
          {canOperate && <EventForm caseId={caseDetail.id} />}
          {events.length > 0 ? (
            <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
              {events.map((e) => (
                <li key={e.id}>
                  <p className="text-xs font-medium text-slate-400">
                    {formatDate(e.event_date)} {e.event_time ? `· ${e.event_time.slice(0, 5)}` : ""}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}</p>
                  {e.observation && <p className="text-sm text-slate-600">{e.observation}</p>}
                  <p className="text-xs text-slate-400">{e.created_by_name}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={Clock} title="Sin eventos" description="Todavía no hay eventos registrados en este caso." />
          )}
        </div>
      ),
    },
    {
      key: "entrevistas",
      label: "Entrevistas",
      content: (
        <div className="space-y-4">
          {canOperate && (
            <InterviewForm caseId={caseDetail.id} students={caseDetail.students.map((s) => s.student)} guardians={guardians} />
          )}
          {interviews.length > 0 ? (
            <ul className="space-y-2">
              {interviews.map((i) => (
                <li key={i.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {INTERVIEW_PARTICIPANT_LABELS[i.participant_type]}: {i.student_name ?? i.guardian_name ?? i.participant_other ?? "—"}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(i.interview_date)}</span>
                  </div>
                  {i.summary && <p className="mt-1 text-sm text-slate-600">{i.summary}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Responsable: {i.responsible_name}</span>
                    <Link href={`/plataforma/api/convivencia/entrevistas/${i.id}/pdf`} target="_blank" className="text-xs font-medium text-brand-700 hover:underline">
                      Generar Acta PDF
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageSquare} title="Sin entrevistas" />
          )}
        </div>
      ),
    },
  ];

  // Cerca del inicio de la barra de pestañas a propósito (que puede
  // desbordar horizontalmente en casos con muchas pestañas) para que sea
  // fácil de encontrar.
  if (canViewAttachments) {
    tabs.push({
      key: "documentos",
      label: "Actas y documentos",
      content: <CaseAttachmentsPanel caseId={caseDetail.id} canManage={canManage} isFullAdmin={isFullAdmin} attachments={attachments} />,
    });
  }

  if (canManage) {
    tabs.push({
      key: "medidas",
      label: "Medidas y acuerdos",
      content: (
        <div className="space-y-4">
          <MeasureForm caseId={caseDetail.id} />
          {measures.length > 0 ? (
            <ul className="space-y-2">
              {measures.map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-800">{m.description}</p>
                    <Badge tone={MEASURE_STATUS_TONE[m.status]}>{MEASURE_STATUS_LABELS[m.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {m.responsible_name} · Inicio {formatDate(m.start_date)}
                    {m.review_date ? ` · Revisión ${formatDate(m.review_date)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ClipboardCheck} title="Sin medidas registradas" />
          )}
        </div>
      ),
    });
  }

  tabs.push({
    key: "seguimientos",
    label: "Seguimientos",
    content: (
      <div className="space-y-4">
        {canOperate && <FollowupForm caseId={caseDetail.id} />}
        <p className="text-xs text-slate-400">Ver todos los seguimientos del caso en <Link href="/plataforma/convivencia/seguimientos" className="text-brand-700 hover:underline">Seguimientos</Link>.</p>
      </div>
    ),
  });

  tabs.push({
    key: "comunicaciones",
    label: "Comunicaciones",
    content: (
      <div className="space-y-4">
        {canOperate && <CommunicationForm caseId={caseDetail.id} guardians={guardians} />}
        {communications.length > 0 ? (
          <ul className="space-y-2">
            {communications.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {COMM_TYPE_LABELS[c.comm_type]} con {c.guardian_name}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(c.comm_date)}</span>
                </div>
                {c.result && <p className="mt-1 text-sm text-slate-600">{c.result}</p>}
                <p className="mt-1 text-xs text-slate-400">{c.staff_name}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Send} title="Sin comunicaciones" />
        )}
      </div>
    ),
  });

  if (canManage) {
    tabs.push({
      key: "derivaciones",
      label: "Derivaciones",
      content: (
        <div className="space-y-4">
          <ReferralForm caseId={caseDetail.id} />
          {referrals.length > 0 ? (
            <ul className="space-y-2">
              {referrals.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {REFERRAL_TYPE_LABELS[r.referral_type]} — {r.institution}
                    </span>
                    <Badge tone="neutral">{REFERRAL_STATUS_LABELS[r.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{r.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.responsible_name} · {formatDate(r.referral_date)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="Sin derivaciones" />
          )}
        </div>
      ),
    });

    tabs.push({
      key: "protocolos",
      label: "Protocolos",
      content: (
        <div className="space-y-4">
          <CaseProtocolForm caseId={caseDetail.id} protocols={protocols} />
          {caseProtocols.length > 0 ? (
            <ul className="space-y-2">
              {caseProtocols.map((p) => (
                <li key={p.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">{p.protocol_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Activado {formatDate(p.activated_at)} · {p.responsible_name}
                    {p.deadline ? ` · Plazo ${formatDate(p.deadline)}` : ""}
                  </p>
                  {p.actions_pending && <p className="mt-1 text-sm text-slate-600">Pendiente: {p.actions_pending}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShieldCheck} title="Sin protocolos activados" />
          )}
        </div>
      ),
    });
  }

  return (
    <div>
      <Link href="/plataforma/convivencia/casos" className="text-xs font-medium text-brand-700 hover:underline">
        ← Casos
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-lg font-semibold text-slate-900">Caso N.º {caseDetail.folio}</h2>
          <p className="text-sm text-slate-500">{caseDetail.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={CASE_STATUS_TONE[caseDetail.status]}>{CASE_STATUS_LABELS[caseDetail.status]}</Badge>
          <Badge tone={PRIORITY_TONE[caseDetail.priority]}>Prioridad {PRIORITY_LABELS[caseDetail.priority]}</Badge>
          {canManage && (
            <CaseActionsMenu
              caseId={caseDetail.id}
              caseFolio={caseDetail.folio}
              isFullAdmin={isFullAdmin}
              title={caseDetail.title}
              status={caseDetail.status}
              caseTypeId={caseDetail.case_type_id}
              priority={caseDetail.priority}
              responsibleId={caseDetail.responsible_id}
              academicYearId={caseDetail.academic_year_id}
              caseTypes={caseTypes}
              managers={managers}
              academicYears={academicYears}
              contentCount={attachments.length + interviews.length + measures.length + referrals.length}
            />
          )}
        </div>
      </div>

      {canManage && (
        <div className="mt-3">
          <CaseContentSummary
            documentsCount={attachments.length}
            interviewsCount={interviews.length}
            measuresCount={measures.length}
            referralsCount={referrals.length}
          />
        </div>
      )}

      {/* Bloque siempre visible en la ficha del caso -- a propósito NO
          depende de que se encuentre/seleccione la pestaña "Actas y
          documentos" (que se deja intacta más abajo, dentro de tabs, para
          quien prefiera navegar por pestañas). Mismos datos, mismo
          CaseAttachmentsPanel -- sin duplicar lógica de carga/listado. */}
      {canViewAttachments && (
        <Card className="mt-4">
          <CardBody>
            <h3 className="text-base font-semibold text-slate-900">Actas de reunión y documentos</h3>
            <p className="mt-1 text-xs text-slate-500">
              Actas físicas (reunión → impresión → firmas → escaneo) y otros documentos de respaldo de este caso.
            </p>
            <div className="mt-4">
              <CaseAttachmentsPanel caseId={caseDetail.id} canManage={canManage} isFullAdmin={isFullAdmin} attachments={attachments} />
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mt-4">
        <CardBody>
          <CaseTabs tabs={tabs} />
        </CardBody>
      </Card>
    </div>
  );
}
