"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { ATTACHMENT_DOCUMENT_TYPE_LABELS } from "@/features/convivencia/labels";
import type { ConvivenciaAttachmentDocumentType, ConvivenciaAttachmentStatus } from "@/types/database";

const DOCUMENT_TYPES = Object.keys(ATTACHMENT_DOCUMENT_TYPE_LABELS).filter((t) => t !== "acta_firmada");

/** Sube un acta/documento nuevo, asociado al caso. La versión firmada NO se sube aquí -- ver CaseAttachmentSignedUpload, que crea una fila aparte sin reemplazar esta. */
export function CaseAttachmentUploadForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
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
      formEl?.reset();
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof FileValidationError ? err.message : "No pudimos subir el archivo.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Subir acta o documento</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Tipo" htmlFor="document_type" required>
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
      <FormField label="Archivo" htmlFor="file" required hint="PDF, DOCX, JPG o PNG, máximo 15 MB.">
        <Input id="file" name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" required />
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Upload className="h-4 w-4" /> {loading ? "Subiendo…" : "Subir"}
      </Button>
    </form>
  );
}
