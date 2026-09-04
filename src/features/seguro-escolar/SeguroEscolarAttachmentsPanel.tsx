"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, Paperclip, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, getSignedUrl, FileValidationError } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils";
import { SEGURO_ESCOLAR_ATTACHMENT_TYPE_LABELS } from "@/features/seguro-escolar/labels";
import type { AttachmentListItem } from "@/services/seguro-escolar";
import type { SeguroEscolarAttachmentType } from "@/types/database";

/** Documentos adjuntos del expediente -- Storage privado
 * (archivos-internos/seguro-escolar/{declarationId}/), nunca public/. No
 * forma parte del PDF oficial 0374-3: es el expediente digital interno
 * (seguro firmado escaneado, documentos del centro asistencial,
 * certificados, respaldo de seguimiento). */
export function SeguroEscolarAttachmentsPanel({ declarationId, canManage, attachments }: { declarationId: string; canManage: boolean; attachments: AttachmentListItem[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;
    const documentType = String(form.get("document_type") || "otro") as SeguroEscolarAttachmentType;
    const description = String(form.get("description") || "").trim() || null;

    if (!file || file.size === 0) {
      setError("Selecciona un archivo.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    try {
      const path = await uploadPrivateFile(`seguro-escolar/${declarationId}`, file, "seguro_escolar_document");
      const { data: inserted, error: insertError } = await supabase
        .from("seguro_escolar_attachments")
        .insert({ declaration_id: declarationId, storage_path: path, file_name: file.name, document_type: documentType, description, uploaded_by: user.id })
        .select("id")
        .single();
      if (insertError || !inserted) throw insertError ?? new Error("No pudimos registrar el documento.");

      await supabase.rpc("log_audit", {
        p_action: "adjuntar_documento_seguro_escolar",
        p_module: "seguro_escolar",
        p_entity: "seguro_escolar_attachments",
        p_entity_id: inserted.id,
        p_details: { document_type: documentType, declaration_id: declarationId },
      });

      setLoading(false);
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof FileValidationError ? err.message : "No pudimos subir el archivo.");
    }
  }

  async function handleView(storagePath: string) {
    const url = await getSignedUrl(storagePath, 120);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      {canManage && !formOpen && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Upload className="h-4 w-4" /> + Adjuntar antecedente
          </Button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Tipo de documento" htmlFor="document_type" required>
              <Select id="document_type" name="document_type" defaultValue="seguro_firmado" required>
                {Object.entries(SEGURO_ESCOLAR_ATTACHMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Archivo" htmlFor="file" required hint="PDF, JPG o PNG, máximo 15 MB.">
              <Input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required />
            </FormField>
          </div>
          <FormField label="Descripción" htmlFor="description" hint="Opcional">
            <Textarea id="description" name="description" rows={2} />
          </FormField>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              <Upload className="h-4 w-4" /> {loading ? "Subiendo…" : "Guardar"}
            </Button>
          </div>
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
                    Subido {formatDate(a.created_at)} por {a.uploadedByName}
                    {a.description && <> · {a.description}</>}
                  </p>
                </div>
                <Badge tone="neutral">{SEGURO_ESCOLAR_ATTACHMENT_TYPE_LABELS[a.document_type]}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" onClick={() => handleView(a.storage_path)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                  <Eye className="h-3.5 w-3.5" /> Ver
                </button>
                <button type="button" onClick={() => handleView(a.storage_path)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                  <Download className="h-3.5 w-3.5" /> Descargar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !formOpen && <EmptyState icon={Paperclip} title="Sin documentos adjuntos" />
      )}
    </div>
  );
}
