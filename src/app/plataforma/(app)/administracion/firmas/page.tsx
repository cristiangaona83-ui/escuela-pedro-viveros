import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PenTool, ShieldAlert, Stamp } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SignatureUploadForm } from "@/features/admin/SignatureUploadForm";
import { ToggleSignatureActiveButton } from "@/features/admin/ToggleSignatureActiveButton";
import { StampUploadForm } from "@/features/admin/StampUploadForm";
import { RemoveStampButton } from "@/features/admin/RemoveStampButton";
import { listSignatures, getStampAdminState, type SignatureAdminRow } from "@/services/signatures-admin";
import { listAllStaffMembers } from "@/services/staff-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Firmas institucionales" };

const WRITE_ROLES = ["director", "superadmin"] as const;

const KIND_LABEL: Record<SignatureAdminRow["kind"], string> = {
  director: "Director",
  teacher: "Profesor(a) Jefe",
  other: "Otra",
};

export default async function FirmasInstitucionalesPage() {
  const session = await getSessionContext();
  if (!session) redirect("/plataforma/login");
  const allowedToWrite = canWrite(session.roles, [...WRITE_ROLES]);
  if (!allowedToWrite) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Firmas institucionales</h1>
        <div className="mt-6">
          <EmptyState icon={ShieldAlert} title="Sin acceso" description="Solo Dirección y Superadministrador pueden gestionar firmas institucionales." />
        </div>
      </div>
    );
  }

  const [signatures, teachers, stamp] = await Promise.all([listSignatures(), listAllStaffMembers(), getStampAdminState()]);

  const groups = signatures.reduce<Record<string, SignatureAdminRow[]>>((acc, s) => {
    const key = s.kind === "teacher" ? `teacher:${s.staff_member_id}` : s.kind;
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-3">
        <PenTool className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Firmas institucionales</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Se usan en el Certificado de Alumno Regular y los certificados/informes de calificaciones. Se almacenan exclusivamente en el bucket privado — nunca se exponen públicamente.
      </p>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center gap-2">
            <Stamp className="h-5 w-5 text-brand-700" />
            <h2 className="font-semibold text-slate-900">Timbre del Director</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Uno solo para toda la escuela — se agrega automáticamente a la derecha de la firma del Director en los documentos que ya la usan. No depende del funcionario que firme.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              {stamp.previewDataUri ? (
                <Image src={stamp.previewDataUri} alt="Timbre del Director" width={80} height={80} className="h-20 w-20 object-contain" unoptimized />
              ) : (
                <span className="text-center text-[10px] text-slate-400">Sin timbre</span>
              )}
            </div>
            <div>
              <StampUploadForm hasStamp={Boolean(stamp.storagePath)} previousPath={stamp.storagePath} />
              {stamp.storagePath && (
                <div className="mt-3">
                  <RemoveStampButton storagePath={stamp.storagePath} />
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {Object.keys(groups).length === 0 ? (
            <Card><CardBody><EmptyState icon={PenTool} title="Sin firmas registradas" description="Sube la firma del Director para empezar." /></CardBody></Card>
          ) : (
            Object.entries(groups).map(([key, rows]) => {
              const active = rows.find((r) => r.active);
              const history = rows.filter((r) => !r.active);
              return (
                <Card key={key}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-slate-900">
                        {KIND_LABEL[rows[0].kind]}
                        {rows[0].staff_member ? ` — ${rows[0].staff_member.full_name}` : ""}
                      </h2>
                      {active ? <Badge tone="success">Activa</Badge> : <Badge tone="warning">Sin firma activa</Badge>}
                    </div>

                    {active && (
                      <div className="mt-3 flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        {active.previewDataUri ? (
                          <Image src={active.previewDataUri} alt={`Firma de ${active.display_name}`} width={140} height={70} className="h-16 w-auto object-contain" unoptimized />
                        ) : (
                          <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">Sin vista previa</div>
                        )}
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-slate-800">{active.display_name}</p>
                          <p className="text-slate-500">{active.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Actualizada el {formatDate(active.updated_at, { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                        <ToggleSignatureActiveButton signatureId={active.id} kind={active.kind} staffMemberId={active.staff_member_id} active={true} displayName={active.display_name} />
                      </div>
                    )}

                    {history.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">Historial ({history.length})</summary>
                        <ul className="mt-2 space-y-2">
                          {history.map((h) => (
                            <li key={h.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
                              {h.previewDataUri ? (
                                <Image src={h.previewDataUri} alt={`Firma anterior de ${h.display_name}`} width={80} height={40} className="h-10 w-auto object-contain opacity-70" unoptimized />
                              ) : (
                                <div className="h-10 w-20 rounded border border-dashed border-slate-200" />
                              )}
                              <div className="flex-1 text-xs text-slate-500">
                                <p>{h.display_name} · {h.title}</p>
                                <p className="text-slate-400">Subida el {formatDate(h.created_at, { day: "numeric", month: "long", year: "numeric" })}</p>
                              </div>
                              <ToggleSignatureActiveButton signatureId={h.id} kind={h.kind} staffMemberId={h.staff_member_id} active={false} displayName={h.display_name} />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Subir nueva firma</h2>
            <p className="mt-1 text-xs text-slate-500">Se activa automáticamente y reemplaza a la anterior del mismo tipo.</p>
            <div className="mt-4">
              <SignatureUploadForm teachers={teachers} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
