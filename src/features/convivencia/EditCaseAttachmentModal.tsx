"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, deletePrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { ATTACHMENT_DOCUMENT_TYPE_LABELS } from "@/features/convivencia/labels";
import type { ConvivenciaAttachmentDocumentType, ConvivenciaAttachmentRow, ConvivenciaAttachmentStatus } from "@/types/database";
import type { CaseAttachmentListItem } from "@/services/convivencia";

const DOCUMENT_TYPES = Object.keys(ATTACHMENT_DOCUMENT_TYPE_LABELS).filter((t) => t !== "acta_firmada");
const EDITABLE_STATUSES: ConvivenciaAttachmentStatus[] = ["borrador", "finalizada", "archivada"];

/**
 * Edita metadatos de un documento -- y, opcionalmente, reemplaza el archivo.
 * El reemplazo sigue el mismo orden que el resto de la plataforma: sube el
 * archivo nuevo primero, confirma el UPDATE en base de datos, y solo
 * entonces borra el archivo viejo de Storage. Si el UPDATE falla, se borra
 * el archivo recién subido (rollback) y el documento original queda intacto
 * -- nunca queda una fila apuntando a un archivo que ya no existe.
 */
export function EditCaseAttachmentModal({
  caseId,
  attachment,
  open,
  onClose,
}: {
  caseId: string;
  attachment: CaseAttachmentListItem;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim() || null;
    const documentType = String(form.get("document_type") || "otro") as ConvivenciaAttachmentDocumentType;
    const documentDate = String(form.get("document_date") || "") || null;
    const description = String(form.get("description") || "").trim() || null;
    const status = String(form.get("status") || attachment.status) as ConvivenciaAttachmentStatus;
    const file = form.get("file") as File | null;

    setSaving(true);
    setError(null);
    const supabase = createClient();

    let newPath: string | null = null;
    try {
      if (file && file.size > 0) {
        newPath = await uploadPrivateFile(`convivencia/actas/${caseId}`, file, "case_attachment");
      }

      const updates: Partial<ConvivenciaAttachmentRow> = {
        title,
        document_type: attachment.document_type === "acta_firmada" ? "acta_firmada" : documentType,
        document_date: documentDate,
        description,
        status,
        ...(newPath ? { storage_path: newPath, file_name: file!.name, mime_type: file!.type || null, file_size_bytes: file!.size } : {}),
      };

      const { error: updateError } = await supabase.from("convivencia_attachments").update(updates).eq("id", attachment.id);
      if (updateError) throw updateError;

      if (newPath) {
        await deletePrivateFile(attachment.storage_path);
      }

      await supabase.rpc("log_audit", {
        p_action: "editar_documento_convivencia",
        p_module: "convivencia",
        p_entity: "convivencia_attachments",
        p_entity_id: attachment.id,
        p_details: { file_replaced: Boolean(newPath), case_id: caseId },
      });

      await supabase.from("convivencia_events").insert({
        case_id: caseId,
        event_type: "documento_editado",
        observation: `Documento actualizado: ${title ?? attachment.file_name}.`,
      });

      setSaving(false);
      showToast("success", "Documento actualizado.");
      onClose();
      router.refresh();
    } catch (err) {
      if (newPath) await deletePrivateFile(newPath);
      setSaving(false);
      setError(err instanceof FileValidationError ? err.message : "No pudimos actualizar el documento.");
    }
  }

  return (
    <Modal open={open} onClose={() => (!saving ? onClose() : undefined)} title="Editar información del documento" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Título" htmlFor="title" hint="Opcional -- si se deja vacío, se muestra el nombre del archivo.">
          <Input id="title" name="title" defaultValue={attachment.title ?? ""} />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tipo" htmlFor="document_type" required>
            <Select id="document_type" name="document_type" defaultValue={attachment.document_type ?? "otro"} required disabled={attachment.document_type === "acta_firmada"}>
              {attachment.document_type === "acta_firmada" ? (
                <option value="acta_firmada">{ATTACHMENT_DOCUMENT_TYPE_LABELS.acta_firmada}</option>
              ) : (
                DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{ATTACHMENT_DOCUMENT_TYPE_LABELS[t]}</option>
                ))
              )}
            </Select>
          </FormField>
          <FormField label="Fecha del acta" htmlFor="document_date">
            <Input id="document_date" name="document_date" type="date" defaultValue={attachment.document_date ?? ""} />
          </FormField>
        </div>

        <FormField label="Descripción o asunto" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={attachment.description ?? ""} />
        </FormField>

        <FormField label="Estado" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={attachment.status} required disabled={attachment.status === "firmada"}>
            {attachment.status === "firmada" ? (
              <option value="firmada">Firmada</option>
            ) : (
              EDITABLE_STATUSES.map((s) => (
                <option key={s} value={s}>{s === "borrador" ? "Borrador" : s === "finalizada" ? "Finalizada" : "Archivada"}</option>
              ))
            )}
          </Select>
        </FormField>

        <FormField label="Reemplazar archivo" htmlFor="file" hint="Opcional -- deja en blanco para mantener el archivo actual. PDF, JPG, JPEG, PNG o DOCX, máximo 15 MB.">
          <Input id="file" name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" />
        </FormField>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
