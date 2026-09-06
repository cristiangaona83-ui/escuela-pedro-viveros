"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, UploadCloud, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, uploadPrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { CIRCULARES_CATEGORY } from "@/features/documents/circulares/constants";
import type { DocumentStatus } from "@/types/database";

const FOLDER = "documentos/circulares";

/**
 * Alta de una Circular Informativa -- misma infraestructura del módulo
 * Documentos (tabla `documents`, Storage archivos-publicos/archivos-internos,
 * carpeta "documentos/..." ya autorizada por las políticas de 0005/0010),
 * solo que con los campos propios de esta categoría (número, fecha, estado)
 * que las demás categorías de Documentos no usan.
 */
export function NewCircularModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [status, setStatus] = useState<DocumentStatus>("publicada");

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;

    if (!file || file.size === 0) {
      setLoading(false);
      setError("Selecciona un archivo PDF o DOCX.");
      return;
    }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    let fileUrl: string;
    try {
      fileUrl = isPublic ? await uploadPublicFile(FOLDER, file, "circular_document") : await uploadPrivateFile(FOLDER, file, "circular_document");
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir el archivo.");
      return;
    }

    const payload = {
      title: String(form.get("title") || ""),
      category: CIRCULARES_CATEGORY,
      document_number: String(form.get("document_number") || "").trim() || null,
      document_date: String(form.get("document_date") || "") || null,
      year: form.get("year") ? Number(form.get("year")) : null,
      description: String(form.get("description") || "").trim() || null,
      file_url: fileUrl,
      is_public: isPublic,
      status,
      uploaded_by: authData.user?.id,
    };

    const { data: inserted, error: dbError } = await supabase.from("documents").insert(payload).select("id").single();
    if (dbError || !inserted) {
      setLoading(false);
      setError("No pudimos guardar la circular.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "crear_circular_informativa",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: inserted.id,
      p_details: { title: payload.title, document_number: payload.document_number, status: payload.status },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar Circular Informativa
      </Button>

      <Modal open={open} onClose={handleClose} title="Nueva Circular Informativa" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Número de circular" htmlFor="document_number" hint="Opcional -- déjalo vacío si no aplica correlativo">
              <Input id="document_number" name="document_number" />
            </FormField>
            <FormField label="Fecha" htmlFor="document_date" required>
              <Input id="document_date" name="document_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
          </div>
          <FormField label="Título" htmlFor="title" required>
            <Input id="title" name="title" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Año" htmlFor="year" required>
              <Input id="year" name="year" type="number" required defaultValue={new Date().getFullYear()} />
            </FormField>
            <FormField label="Estado" htmlFor="status">
              <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as DocumentStatus)}>
                <option value="borrador">Borrador</option>
                <option value="publicada">Publicada</option>
                <option value="archivada">Archivada</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Descripción / asunto" htmlFor="description" hint="Opcional">
            <Textarea id="description" name="description" rows={3} />
          </FormField>
          <FormField label="Archivo" htmlFor="file" required hint="Máximo 15 MB. PDF o DOCX.">
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
              <UploadCloud className="h-4 w-4" /> {loading ? "Guardando…" : "Publicar circular"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
