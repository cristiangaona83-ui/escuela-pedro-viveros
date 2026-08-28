"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, deletePublicFile, pathFromPublicUrl, FileValidationError } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils";
import { NewsEditor } from "@/features/news/NewsEditor";
import { parseNewsContent, isNewsContentEmpty, EMPTY_NEWS_CONTENT } from "@/lib/news-content";
import type { NewsRow } from "@/types/database";

const FOLDER = "noticias";

export function NewsForm({ news }: { news?: NewsRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(news?.published ?? false);
  const [content, setContent] = useState<JSONContent>(() => (news?.content ? parseNewsContent(news.content) : EMPTY_NEWS_CONTENT));
  const isEdit = Boolean(news);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("cover_image") as File | null;

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    let coverImageUrl = news?.cover_image_url ?? null;
    let previousImageUrl: string | null = null;

    try {
      if (file && file.size > 0) {
        previousImageUrl = news?.cover_image_url ?? null;
        coverImageUrl = await uploadPublicFile(FOLDER, file, "image");
      }
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir la imagen.");
      return;
    }

    if (isNewsContentEmpty(content)) {
      setLoading(false);
      setError("Escribe el contenido de la noticia.");
      return;
    }

    const title = String(form.get("title") || "").trim();

    const payload = {
      title,
      slug: news?.slug ?? slugify(title),
      category: String(form.get("category") || "General").trim() || "General",
      summary: String(form.get("summary") || "").trim(),
      content: JSON.stringify(content),
      cover_image_url: coverImageUrl,
      published,
      published_at: published ? news?.published_at ?? new Date().toISOString() : news?.published_at ?? null,
      author_id: news?.author_id ?? authData.user?.id,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("news").update(payload).eq("id", news!.id)
      : await supabase.from("news").insert(payload);

    if (dbError) {
      setLoading(false);
      setError(dbError.code === "23505" ? "Ya existe una noticia con un título muy similar (slug duplicado)." : "No pudimos guardar la noticia.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_noticia" : "crear_noticia",
      p_module: "noticias",
      p_entity: "news",
      p_entity_id: news?.id,
      p_details: { title: payload.title, published: payload.published },
    });

    if (previousImageUrl) {
      const oldPath = pathFromPublicUrl(previousImageUrl);
      if (oldPath) void deletePublicFile(oldPath);
    }

    setLoading(false);
    router.push("/plataforma/noticias");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={news?.title} />
      </FormField>
      <FormField label="Categoría" htmlFor="category" hint="Ej: General, Comunidad, Académico">
        <Input id="category" name="category" defaultValue={news?.category ?? "General"} />
      </FormField>
      <FormField label="Resumen" htmlFor="summary" required hint="Se muestra en el listado del sitio público.">
        <Textarea id="summary" name="summary" required defaultValue={news?.summary} />
      </FormField>
      <FormField label="Contenido" htmlFor="content" required>
        <NewsEditor content={content} onChange={setContent} />
      </FormField>
      <FormField
        label="Imagen destacada"
        htmlFor="cover_image"
        hint={news?.cover_image_url ? "Opcional — déjalo vacío para conservar la imagen actual." : "Opcional. JPG, PNG o WEBP, máximo 5 MB."}
      >
        <Input id="cover_image" name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Publicada (visible en el sitio público)
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear noticia"}
      </Button>
    </form>
  );
}
