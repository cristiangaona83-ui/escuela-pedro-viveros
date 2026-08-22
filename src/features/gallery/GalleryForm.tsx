"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, deletePublicFile, pathFromPublicUrl, FileValidationError } from "@/lib/supabase/storage";
import type { GalleryRow } from "@/types/database";

const FOLDER = "galeria";

export function GalleryForm({ item }: { item?: GalleryRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(item?.published ?? true);
  const isEdit = Boolean(item);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("image") as File | null;

    if (!isEdit && (!file || file.size === 0)) {
      setLoading(false);
      setError("Selecciona una imagen.");
      return;
    }

    let imageUrl = item?.image_url ?? "";
    let previousImageUrl: string | null = null;

    try {
      if (file && file.size > 0) {
        previousImageUrl = item?.image_url ?? null;
        imageUrl = await uploadPublicFile(FOLDER, file, "image");
      }
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir la imagen.");
      return;
    }

    const payload = {
      title: String(form.get("title") || "").trim(),
      category: String(form.get("category") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      image_url: imageUrl,
      event_date: String(form.get("event_date") || "") || null,
      published,
    };

    const supabase = createClient();
    const { error: dbError } = isEdit
      ? await supabase.from("gallery").update(payload).eq("id", item!.id)
      : await supabase.from("gallery").insert(payload);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar el elemento de la galería.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_galeria" : "crear_galeria",
      p_module: "galeria",
      p_entity: "gallery",
      p_entity_id: item?.id,
      p_details: { title: payload.title, published: payload.published },
    });

    if (previousImageUrl) {
      const oldPath = pathFromPublicUrl(previousImageUrl);
      if (oldPath) void deletePublicFile(oldPath);
    }

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/galeria");
    } else {
      event.currentTarget.reset();
      setPublished(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={item?.title} />
      </FormField>
      <FormField label="Categoría" htmlFor="category" required hint="Ej: Actividades, Efemérides, Deportes">
        <Input id="category" name="category" required defaultValue={item?.category} />
      </FormField>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" defaultValue={item?.description ?? undefined} />
      </FormField>
      <FormField
        label={isEdit ? "Reemplazar imagen" : "Imagen"}
        htmlFor="image"
        required={!isEdit}
        hint={isEdit ? "Opcional — déjalo vacío para conservar la imagen actual." : "JPG, PNG o WEBP, máximo 5 MB."}
      >
        <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!isEdit} />
      </FormField>
      <FormField label="Fecha" htmlFor="event_date" hint="Opcional">
        <Input id="event_date" name="event_date" type="date" defaultValue={item?.event_date ?? undefined} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Visible en el sitio público
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar a la galería"}
      </Button>
    </form>
  );
}
