"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, deletePublicFile, pathFromPublicUrl, FileValidationError } from "@/lib/supabase/storage";
import type { CircularInformativaRow } from "@/types/database";

const FOLDER = "circulares-informativas";

/** Alta/edición de una Circular Informativa -- sección pública propia del
 * sitio web (independiente de Documentos y de Informativos Semanales),
 * mismo patrón de archivo que DocumentForm.tsx: PDF subido directamente,
 * reemplazable dentro del mismo formulario. */
export function CircularInformativaForm({ circular }: { circular?: CircularInformativaRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(circular?.visible ?? true);
  const isEdit = Boolean(circular);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;

    if (!isEdit && (!file || file.size === 0)) {
      setLoading(false);
      setError("Selecciona el archivo PDF de la circular.");
      return;
    }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    let fileUrl = circular?.file_url ?? "";
    let previousFileUrl: string | null = null;

    if (file && file.size > 0) {
      try {
        previousFileUrl = circular?.file_url ?? null;
        fileUrl = await uploadPublicFile(FOLDER, file, "document");
      } catch (uploadError) {
        setLoading(false);
        setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir el archivo.");
        return;
      }
    }

    const payload = {
      title: String(form.get("title") || ""),
      document_number: String(form.get("document_number") || "").trim() || null,
      circular_date: String(form.get("circular_date") || ""),
      description: String(form.get("description") || "").trim() || null,
      file_url: fileUrl,
      display_order: form.get("display_order") ? Number(form.get("display_order")) : 0,
      visible,
      created_by: authData.user?.id,
    };

    const { data: saved, error: dbError } = isEdit
      ? await supabase.from("circulares_informativas").update(payload).eq("id", circular!.id).select("id").single()
      : await supabase.from("circulares_informativas").insert(payload).select("id").single();

    if (dbError || !saved) {
      setLoading(false);
      setError("No pudimos guardar la circular.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "editar_circular_informativa" : "crear_circular_informativa",
      p_module: "circulares_informativas",
      p_entity: "circulares_informativas",
      p_entity_id: saved.id,
      p_details: { title: payload.title, document_number: payload.document_number },
    });

    if (previousFileUrl) {
      const oldPath = pathFromPublicUrl(previousFileUrl);
      if (oldPath) void deletePublicFile(oldPath);
    }

    setLoading(false);
    router.push("/plataforma/circulares-informativas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Número de circular" htmlFor="document_number" hint="Opcional -- déjalo vacío si no aplica correlativo">
          <Input id="document_number" name="document_number" defaultValue={circular?.document_number ?? ""} />
        </FormField>
        <FormField label="Fecha" htmlFor="circular_date" required>
          <Input id="circular_date" name="circular_date" type="date" required defaultValue={circular?.circular_date ?? new Date().toISOString().slice(0, 10)} />
        </FormField>
      </div>
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={circular?.title} />
      </FormField>
      <FormField label="Descripción breve" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" rows={3} defaultValue={circular?.description ?? ""} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={isEdit ? "Reemplazar archivo (PDF)" : "Archivo (PDF)"}
          htmlFor="file"
          required={!isEdit}
          hint={isEdit ? "Opcional -- déjalo vacío para conservar el archivo actual." : "Máximo 15 MB, solo PDF."}
        >
          <Input id="file" name="file" type="file" accept="application/pdf" required={!isEdit} />
        </FormField>
        <FormField label="Orden" htmlFor="display_order" hint="Menor número aparece primero en la web pública">
          <Input id="display_order" name="display_order" type="number" defaultValue={circular?.display_order ?? 0} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Visible en la página pública
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" size="sm" disabled={loading}>
        <UploadCloud className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Publicar circular"}
      </Button>
    </form>
  );
}
