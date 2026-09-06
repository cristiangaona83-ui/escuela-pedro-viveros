"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPublicFile,
  uploadPrivateFile,
  deletePublicFile,
  deletePrivateFile,
  pathFromPublicUrl,
  FileValidationError,
} from "@/lib/supabase/storage";
import type { CircularListItem } from "@/services/documents";

const FOLDER = "documentos/circulares";

export function ReplaceCircularFileDialog({ open, onClose, circular }: { open: boolean; onClose: () => void; circular: CircularListItem }) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(circular.is_public);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (loading) return;
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) {
      setLoading(false);
      setError("Selecciona el nuevo archivo.");
      return;
    }

    const supabase = createClient();
    let fileUrl: string;
    try {
      fileUrl = isPublic ? await uploadPublicFile(FOLDER, file, "circular_document") : await uploadPrivateFile(FOLDER, file, "circular_document");
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir el archivo.");
      return;
    }

    const { error: dbError } = await supabase.from("documents").update({ file_url: fileUrl, is_public: isPublic }).eq("id", circular.id);
    if (dbError) {
      setLoading(false);
      setError("No pudimos actualizar la circular.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "reemplazar_archivo_circular",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: circular.id,
      p_details: { title: circular.title },
    });

    // Recién ahora que la BD confirmó el cambio se borra el archivo anterior -- nunca antes.
    if (circular.is_public) {
      const oldPath = pathFromPublicUrl(circular.file_url);
      if (oldPath) void deletePublicFile(oldPath);
    } else {
      void deletePrivateFile(circular.file_url);
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reemplazar archivo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          N.º {circular.document_number ?? "—"} · {circular.title}
        </p>
        <FormField label="Nuevo archivo" htmlFor="file" required hint="Máximo 15 MB. PDF o DOCX.">
          <Input id="file" name="file" type="file" accept="application/pdf,.docx" required />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Visibilidad: pública (visible en el sitio web, no solo en la plataforma)
        </label>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Reemplazando…" : "Reemplazar archivo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
