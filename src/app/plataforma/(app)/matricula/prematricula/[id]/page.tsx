import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import {
  ENROLLMENT_CHECKLIST,
  PREMATRICULA_STATUS_LABEL,
  PREMATRICULA_STATUS_TONE,
  SUPPORT_OPTIONS,
  TRANSPORT_OPTIONS,
  mergeMatriculaForm,
  type ContactData,
  type MatriculaFormData,
} from "@/lib/matricula";
import { formatDate, formatRun } from "@/lib/utils";
import { PrematriculaReviewPanel } from "@/features/matricula/PrematriculaReviewPanel";
import type { PrematriculaRequestRow } from "@/types/database";

export const metadata: Metadata = { title: "Revisar pre-matrícula" };

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "administrativo"] as const;

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value && value.trim() ? value : <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}

function Contact({ title, c }: { title: string; c: ContactData }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-brand-800">{title}</h3>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Item label="Nombre" value={c.full_name} />
        <Item label="RUN" value={c.run ? formatRun(c.run) : ""} />
        <Item label="Vínculo" value={c.relationship} />
        <Item label="Teléfono" value={c.phone} />
        <Item label="Teléfono alternativo" value={c.phone_alt} />
        <Item label="Correo" value={c.email} />
        <Item label="Domicilio" value={c.address} />
      </dl>
    </div>
  );
}

export default async function PrematriculaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pre-matrícula</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para ver esta solicitud." />
        </div>
      </div>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("prematricula_requests")
    .select("*, prematricula_campaigns(title, academic_years(year))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const request = data as unknown as PrematriculaRequestRow & { prematricula_campaigns: { title: string; academic_years: { year: number } | null } | null };
  const f: MatriculaFormData = mergeMatriculaForm(request.data as Partial<MatriculaFormData>);

  const transport = TRANSPORT_OPTIONS.find((t) => t.value === f.transport_mode)?.label;
  const support = SUPPORT_OPTIONS.find((s) => s.value === f.support_coordination)?.label;
  const docs = ENROLLMENT_CHECKLIST.filter((d) => f.documents[d.code]).map((d) => d.label);

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Matrícula", href: "/plataforma/matricula" },
          { label: "Pre-matrícula", href: "/plataforma/matricula/prematricula" },
          { label: request.student_name ?? "Solicitud" },
        ]}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-brand-700" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{request.student_name}</h1>
            <p className="text-sm text-slate-500">
              {request.prematricula_campaigns?.title} · año {request.prematricula_campaigns?.academic_years?.year} · recibida el {formatDate(request.created_at)}
            </p>
          </div>
        </div>
        <Badge tone={PREMATRICULA_STATUS_TONE[request.status]}>{PREMATRICULA_STATUS_LABEL[request.status]}</Badge>
      </div>

      {request.student_id && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          Ya fue matriculada.{" "}
          <Link href={`/plataforma/estudiantes/${request.student_id}`} className="font-medium underline">
            Ver ficha del estudiante
          </Link>
        </p>
      )}

      <Card className="mt-6">
        <CardBody>
          <PrematriculaReviewPanel requestId={request.id} status={request.status} initialNotes={request.staff_notes ?? ""} />
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-brand-800">Matrícula e identificación</h3>
            <dl className="grid gap-3 sm:grid-cols-3">
              <Item label="Postula a" value={f.level_requested} />
              <Item label="Tipo de matrícula" value={f.admission_type} />
              <Item label="Procedencia" value={f.origin_school} />
              <Item label="Nombres" value={f.first_names} />
              <Item label="Apellido paterno" value={f.paternal_last_name} />
              <Item label="Apellido materno" value={f.maternal_last_name} />
              <Item label="RUN" value={f.run ? formatRun(f.run) : ""} />
              <Item label="IPE" value={f.ipe} />
              <Item label="Fecha de nacimiento" value={f.birth_date ? formatDate(f.birth_date) : ""} />
              <Item label="Nacionalidad" value={f.nationality} />
              <Item label="Sexo registral" value={f.sex === "F" ? "Femenino" : f.sex === "M" ? "Masculino" : ""} />
              <Item label="Nombre social / preferido" value={f.social_name} />
              <Item label="Domicilio" value={f.address_street} />
              <Item label="Comuna" value={f.address_commune} />
              <Item label="Sector / localidad" value={f.address_sector} />
            </dl>
          </div>

          <Contact title="Apoderado/a titular" c={f.guardian} />
          {f.substitute.full_name && <Contact title="Apoderado/a suplente" c={f.substitute} />}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-brand-800">Retiro y emergencia</h3>
            <dl className="grid gap-3 sm:grid-cols-3">
              {f.pickup.filter((p) => p.full_name).map((p, i) => (
                <Item key={i} label={`Autorizado/a para retiro ${i + 1}`} value={[p.full_name, p.relationship, p.phone].filter(Boolean).join(" · ")} />
              ))}
              <Item label="Restricciones de retiro" value={f.pickup_restriction} />
              <Item label="Contacto de emergencia" value={[f.emergency.full_name, f.emergency.phone].filter(Boolean).join(" · ")} />
              <Item label="Alertas de emergencia" value={f.emergency_alerts} />
              <Item label="Coordinación de apoyos escolares" value={support} />
              <Item label="Forma habitual de traslado" value={transport} />
            </dl>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-brand-800">Declaraciones</h3>
            <dl className="grid gap-3 sm:grid-cols-3">
              <Item label="Reglamento interno" value={f.rules_informed ? "Informado/a" : "No indicó"} />
              <Item label="Reglamento de evaluación" value={f.evaluation_rules_informed ? "Informado/a" : "No indicó"} />
              <Item label="Aviso de privacidad" value={f.privacy_informed ? "Aceptado" : "—"} />
              <Item label="Uso de imagen" value={f.image_authorization === "autorizo" ? "Autoriza" : f.image_authorization === "no_autorizo" ? "No autoriza" : ""} />
              <Item label="Documentos" value={docs.join(", ")} />
            </dl>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
