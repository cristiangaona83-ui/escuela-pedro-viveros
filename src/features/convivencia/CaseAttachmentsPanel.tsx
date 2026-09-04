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
import { CaseAttachmentActionsMenu } from "@/features/convivencia/CaseAttachmentActionsMenu";
import type { ConvivenciaAttachmentDocumentType, ConvivenciaAttachmentStatus } from "@/types/database";
import type { CaseAttachmentListItem } from "@/services/convivencia";

const DOCUMENT_TYPES = Object.keys(ATTACHMENT_DOCUMENT_TYPE_LABELS).filter((t) => t !== "acta_firmada");

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Sección completa "Actas de reunión y documentos" del caso -- se usa tanto
 * en el bloque visible de la ficha del caso como en la pestaña "Actas y
 * documentos" (misma lista, mismo componente, sin duplicar lógica). Botón
 * principal para adjuntar (abre el formulario), formulario de carga y
 * listado con acciones. Todo en un solo componente cliente para que el
 * botón del encabezado y el del estado vacío compartan el mismo estado de
 * abierto/cerrado del formulario.
 */
export function CaseAttachmentsPanel({
  caseId,
  canManage,
  isFullAdmin,
  attachments,
}: {
  caseId: string;
  canManage: boolean;
  /** director/superadmin -- puede eliminar documentos en cualquier estado, no solo borrador. */
  isFullAdmin: boolean;
  attachments: CaseAttachmentListItem[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const file = form.get("file") as File | null;
    const title = String(form.get("title") || "").trim() || null;
    const documentType = String(form.get("document_type") || "otro") as ConvivenciaAttachmentDocumentType;
    const status = String(form.get("status") || "finalizada") as ConvivenciaAttachmentStatus;
    const description = String(form.get("description") || "").trim() || null;
    const documentDate = String(form.get("document_date") || "") || null;

    if (!file || file.size === 0) {
      setError("Selecciona un archivo.");
      return;
    }
    if (!documentDate) {
      setError("Indica la fecha del acta.");
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
          title,
          description,
          document_type: documentType,
          document_date: documentDate,
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

      await supabase.from("convivencia_events").insert({
        case_id: caseId,
        event_type: "documento_agregado",
        observation: `Documento agregado: ${title ?? file.name}.`,
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
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Upload className="h-4 w-4" /> + Adjuntar acta escaneada
          </Button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Adjuntar acta escaneada</h3>
            <button type="button" onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <FormField label="Título" htmlFor="title" hint='Opcional -- ej: "Reunión con apoderado 27/08/2026". Si se deja vacío, se muestra el nombre del archivo.'>
            <Input id="title" name="title" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Tipo" htmlFor="document_type" required>
              <Select id="document_type" name="document_type" defaultValue="acta_reunion" required>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{ATTACHMENT_DOCUMENT_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Fecha del acta" htmlFor="document_date" required>
              <Input id="document_date" name="document_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
          </div>
          <FormField label="Descripción o asunto" htmlFor="description" hint='Ej: "Reunión con apoderado por situación ocurrida el 27/08/2026"'>
            <Textarea id="description" name="description" />
          </FormField>
          <FormField label="Estado" htmlFor="status" required>
            <Select id="status" name="status" defaultValue="finalizada" required>
              <option value="borrador">Borrador</option>
              <option value="finalizada">Finalizada</option>
            </Select>
          </FormField>
          <FormField label="Archivo" htmlFor="file" required hint="PDF, JPG, JPEG, PNG o DOCX, máximo 15 MB.">
            <Input id="file" name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" required />
          </FormField>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <Button type="submit" disabled={loading}>
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
                  <p className="truncate text-sm font-medium text-slate-800">{a.title || a.file_name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {a.document_type ? ATTACHMENT_DOCUMENT_TYPE_LABELS[a.document_type] : "—"}
                    {a.document_date && <> · Fecha del acta: {formatDate(a.document_date)}</>}
                    {" "}· Subido {formatDate(a.created_at)} por {a.uploaded_by_name} · {formatFileSize(a.file_size_bytes)}
                  </p>
                  {a.description && <p className="mt-1 text-sm text-slate-600">{a.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={ATTACHMENT_STATUS_TONE[a.status]}>{ATTACHMENT_STATUS_LABELS[a.status]}</Badge>
                  <CaseAttachmentActionsMenu
                    caseId={caseId}
                    attachment={a}
                    canManage={canManage}
                    canDelete={isFullAdmin || (canManage && a.status === "borrador")}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !formOpen && (
          <div>
            <EmptyState icon={Paperclip} title="Este caso aún no tiene actas de reunión adjuntas." />
            <div className="mt-3 flex justify-center">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(true)}>
                <Upload className="h-4 w-4" /> + Adjuntar primera acta
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
