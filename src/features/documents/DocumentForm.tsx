"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPublicFile,
  uploadPrivateFile,
  deletePublicFile,
  deletePrivateFile,
  pathFromPublicUrl,
  FileValidationError,
} from "@/lib/supabase/storage";
import type { DocumentRow } from "@/types/database";

const FOLDER = "documentos";

export function DocumentForm({ document, restrictToPrivate = false }: { document?: DocumentRow; restrictToPrivate?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(restrictToPrivate ? false : (document?.is_public ?? true));
  const [hasNewFile, setHasNewFile] = useState(false);
  const isEdit = Boolean(document);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;

    if (!isEdit && (!file || file.size === 0)) {
      setLoading(false);
      setError("Selecciona un archivo PDF.");
      return;
    }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    let fileUrl = document?.file_url ?? "";
    let previousFileUrl: string | null = null;

    try {
      if (file && file.size > 0) {
        previousFileUrl = document?.file_url ?? null;
        fileUrl = isPublic
          ? await uploadPublicFile(FOLDER, file, "document")
          : await uploadPrivateFile(FOLDER, file, "document");
      }
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir el archivo.");
      return;
    }

    const payload = {
      title: String(form.get("title") || ""),
      category: String(form.get("category") || ""),
      year: form.get("year") ? Number(form.get("year")) : null,
      description: String(form.get("description") || "") || null,
      file_url: fileUrl,
      is_public: isPublic,
      uploaded_by: authData.user?.id,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("documents").update(payload).eq("id", document!.id)
      : await supabase.from("documents").insert(payload);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar el documento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_documento" : "crear_documento",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: document?.id,
      p_details: { title: payload.title, is_public: payload.is_public },
    });

    // Best-effort: si se reemplazó el archivo, borra el anterior (no bloquea el flujo si falla).
    if (previousFileUrl) {
      if (document!.is_public) {
        const oldPath = pathFromPublicUrl(previousFileUrl);
        if (oldPath) void deletePublicFile(oldPath);
      } else {
        void deletePrivateFile(previousFileUrl);
      }
    }

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/documentos");
    } else {
      event.currentTarget.reset();
      setIsPublic(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={document?.title} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Categoría" htmlFor="category" required hint="Ej: PEI, Reglamento, Circular">
          <Input id="category" name="category" required defaultValue={document?.category} />
        </FormField>
        <FormField label="Año" htmlFor="year" hint="Opcional">
          <Input id="year" name="year" type="number" defaultValue={document?.year ?? undefined} />
        </FormField>
      </div>
      <FormField
        label={isEdit ? "Reemplazar archivo (PDF)" : "Archivo (PDF)"}
        htmlFor="file"
        required={!isEdit}
        hint={isEdit ? "Opcional — déjalo vacío para conservar el archivo actual." : "Máximo 15 MB, solo PDF."}
      >
        <Input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required={!isEdit}
          onChange={(e) => setHasNewFile(Boolean(e.target.files?.length))}
        />
      </FormField>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" defaultValue={document?.description ?? undefined} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isPublic}
          disabled={restrictToPrivate || (isEdit && !hasNewFile)}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 disabled:opacity-50"
        />
        Visible en el sitio público
      </label>
      {restrictToPrivate ? (
        <p className="text-xs text-slate-400">Los documentos que subes quedan siempre como internos, nunca visibles en el sitio público.</p>
      ) : (
        isEdit && !hasNewFile && (
          <p className="text-xs text-slate-400">Para cambiar la visibilidad, sube el archivo nuevamente.</p>
        )
      )}

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <Button type="submit" size="sm" disabled={loading}>
        <UploadCloud className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Publicar documento"}
      </Button>
    </form>
  );
}
