"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils";
import { ATTACHMENT_DOCUMENT_TYPE_LABELS, ATTACHMENT_STATUS_LABELS, ATTACHMENT_STATUS_TONE } from "@/features/convivencia/labels";
import { ViewCaseAttachmentButton } from "@/features/convivencia/ViewCaseAttachmentButton";
import { CaseAttachmentSignedUpload } from "@/features/convivencia/CaseAttachmentSignedUpload";
import { ArchiveCaseAttachmentButton } from "@/features/convivencia/ArchiveCaseAttachmentButton";
import type { ConvivenciaAttachmentDocumentType, ConvivenciaAttachmentStatus } from "@/types/database";
import type { CaseAttachmentListItem } from "@/services/convivencia";

const DOCUMENT_TYPES = Object.keys(ATTACHMENT_DOCUMENT_TYPE_LABELS).filter((t) => t !== "acta_firmada");

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Sección completa "Actas y documentos" del caso: botón principal para
 * adjuntar (abre el formulario), formulario de carga y listado con
 * acciones. Todo en un solo componente cliente para que el botón del
 * encabezado y el del estado vacío compartan el mismo estado de
 * abierto/cerrado del formulario.
 */
export function CaseAttachmentsPanel({ caseId, canManage, attachments }: { caseId: string; canManage: boolean; attachments: CaseAttachmentListItem[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const file = form.get("file") as File | null;
    const documentType = String(form.get("document_type") || "otro") as ConvivenciaAttachmentDocumentType;
    const status = String(form.get("status") || "finalizada") as ConvivenciaAttachmentStatus;
    const description = String(form.get("description") || "").trim() || null;

    if (!file || file.size === 0) {
      setError("Selecciona un archivo.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    try {
      const path = await uploadPrivateFile(`convivencia/actas/${caseId}`, file, "case_attachment");
      const { data: inserted, error: insertError } = await supabase
        .from("convivencia_attachments")
        .insert({
          case_id: caseId,
          storage_path: path,
          file_name: file.name,
          description,
          document_type: documentType,
          status,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          uploaded_by: user.id,
        })
        .select("id")
        .single();
      if (insertError || !inserted) throw insertError ?? new Error("No pudimos registrar el documento.");

      await supabase.rpc("log_audit", {
        p_action: "subir_acta_documento",
        p_module: "convivencia",
        p_entity: "convivencia_attachments",
        p_entity_id: inserted.id,
        p_details: { file_name: file.name, document_type: documentType, case_id: caseId },
      });

      setLoading(false);
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof FileValidationError ? err.message : "No pudimos subir el archivo.");
    }
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
            <Upload className="h-4 w-4" /> + Adjuntar acta o documento
          </Button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Adjuntar acta o documento</h3>
            <button type="button" onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Tipo de documento" htmlFor="document_type" required>
              <Select id="document_type" name="document_type" defaultValue="otro" required>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{ATTACHMENT_DOCUMENT_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Estado" htmlFor="status" required>
              <Select id="status" name="status" defaultValue="finalizada" required>
                <option value="borrador">Borrador</option>
                <option value="finalizada">Finalizada</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Descripción" htmlFor="description" hint="Opcional">
            <Textarea id="description" name="description" />
          </FormField>
          <FormField label="Seleccionar archivo" htmlFor="file" required hint="PDF, DOCX, JPG o PNG, máximo 15 MB.">
            <Input id="file" name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" required />
          </FormField>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <Button type="submit" size="sm" disabled={loading}>
            <Upload className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar acta"}
          </Button>
        </form>
      )}

      {attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{a.file_name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {a.document_type ? ATTACHMENT_DOCUMENT_TYPE_LABELS[a.document_type] : "—"} · {formatDate(a.created_at)} · {a.uploaded_by_name} · {formatFileSize(a.file_size_bytes)}
                  </p>
                  {a.description && <p className="mt-1 text-sm text-slate-600">{a.description}</p>}
                </div>
                <Badge tone={ATTACHMENT_STATUS_TONE[a.status]}>{ATTACHMENT_STATUS_LABELS[a.status]}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ViewCaseAttachmentButton storagePath={a.storage_path} />
                {a.document_type !== "acta_firmada" && (
                  <CaseAttachmentSignedUpload caseId={caseId} originalAttachmentId={a.id} />
                )}
                {canManage && a.status !== "archivada" && (
                  <ArchiveCaseAttachmentButton attachmentId={a.id} fileName={a.file_name} />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !formOpen && (
          <div>
            <EmptyState icon={Paperclip} title="Aún no hay actas o documentos adjuntos a este caso." />
            <div className="mt-3 flex justify-center">
              <Button type="button" size="sm" variant="secondary" onClick={() => setFormOpen(true)}>
                <Upload className="h-4 w-4" /> + Adjuntar primera acta
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
