"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, AlertCircle } from "lucide-react";
import { uploadPrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";

/**
 * Sube la copia firmada (escaneada) de un acta ya existente. Nunca reemplaza
 * el archivo original -- crea una fila nueva en convivencia_attachments con
 * document_type='acta_firmada' y related_attachment_id apuntando al acta sin
 * firmar, para que la versión firmada quede claramente identificada.
 */
export function CaseAttachmentSignedUpload({ caseId, originalAttachmentId }: { caseId: string; originalAttachmentId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const inputEl = event.currentTarget;
    if (!file) return;
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
          document_type: "acta_firmada",
          status: "firmada",
          mime_type: file.type || null,
          file_size_bytes: file.size,
          related_attachment_id: originalAttachmentId,
          uploaded_by: user.id,
        })
        .select("id")
        .single();
      if (insertError || !inserted) throw insertError ?? new Error("No pudimos registrar la versión firmada.");

      await supabase.rpc("log_audit", {
        p_action: "subir_acta_firmada",
        p_module: "convivencia",
        p_entity: "convivencia_attachments",
        p_entity_id: inserted.id,
        p_details: { file_name: file.name, related_attachment_id: originalAttachmentId, case_id: caseId },
      });

      setLoading(false);
      if (inputEl) inputEl.value = "";
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof FileValidationError ? err.message : "No pudimos subir el archivo.");
      if (inputEl) inputEl.value = "";
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
      >
        <FileSignature className="h-3.5 w-3.5" /> {loading ? "Subiendo…" : "Subir versión firmada"}
      </button>
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
