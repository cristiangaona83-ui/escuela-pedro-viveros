"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, UploadCloud, PlaySquare as YoutubeIcon, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, deletePublicFile, pathFromPublicUrl, FileValidationError } from "@/lib/supabase/storage";
import { compressVideo, VideoTooLargeError, MAX_OPTIMIZED_SIZE_BYTES, type CompressVideoResult } from "@/lib/video/compressVideo";
import { parseYouTubeUrl } from "@/lib/video/youtube";
import type { GalleryRow, GalleryMediaType } from "@/types/database";

const FOLDER = "galeria";
const VIDEO_FOLDER = "galeria/videos";

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type VideoState =
  | { phase: "idle" }
  | { phase: "loading" | "compressing" | "thumbnail"; percent: number }
  | { phase: "ready"; result: CompressVideoResult }
  | { phase: "too_large"; sizeBytes: number }
  | { phase: "error"; message: string };

const PHASE_LABEL: Record<string, string> = {
  loading: "Preparando video…",
  compressing: "Optimizando…",
  thumbnail: "Generando miniatura…",
};

export function GalleryForm({ item }: { item?: GalleryRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(item?.published ?? true);
  const isEdit = Boolean(item);

  const [mediaKind, setMediaKind] = useState<GalleryMediaType>(item?.media_type ?? "image");
  const [videoState, setVideoState] = useState<VideoState>({ phase: "idle" });
  const [youtubeInput, setYoutubeInput] = useState(item?.youtube_url ?? "");
  const parsedYoutube = mediaKind === "youtube" ? parseYouTubeUrl(youtubeInput) : null;

  async function handleVideoFileSelected(file: File) {
    setVideoState({ phase: "loading", percent: 0 });
    try {
      const result = await compressVideo(file, (p) => setVideoState({ phase: p.phase, percent: p.percent }));
      setVideoState({ phase: "ready", result });
    } catch (err) {
      if (err instanceof VideoTooLargeError) {
        setVideoState({ phase: "too_large", sizeBytes: err.sizeBytes });
      } else {
        setVideoState({ phase: "error", message: "No pudimos optimizar este video. Prueba con otro archivo." });
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const imageFile = form.get("image") as File | null;

    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "").trim();
    const description = String(form.get("description") || "").trim() || null;
    const eventDate = String(form.get("event_date") || "") || null;

    if (!title || !category) {
      setLoading(false);
      setError("Completa título y categoría.");
      return;
    }

    const supabase = createClient();
    let previousImageUrl: string | null = null;

    try {
      if (mediaKind === "image") {
        if (!isEdit && (!imageFile || imageFile.size === 0)) throw new FileValidationError("Selecciona una imagen.");

        let imageUrl = item?.image_url ?? "";
        if (imageFile && imageFile.size > 0) {
          previousImageUrl = item?.image_url ?? null;
          imageUrl = await uploadPublicFile(FOLDER, imageFile, "image");
        }

        const payload = {
          title, category, description, event_date: eventDate, published,
          media_type: "image" as const,
          image_url: imageUrl,
          video_url: null, mime_type: null, duration_seconds: null, resolution: null,
          original_size_bytes: null, optimized_size_bytes: null, savings_percent: null,
          youtube_id: null, youtube_url: null,
        };
        const { error: dbError } = isEdit
          ? await supabase.from("gallery").update(payload).eq("id", item!.id)
          : await supabase.from("gallery").insert({ ...payload, order_index: 0 });
        if (dbError) throw dbError;
      } else if (mediaKind === "video") {
        if (isEdit) {
          // Editar un video existente solo actualiza metadatos -- el archivo
          // (video_url/image_url/tamaños/etc.) se deja intacto tal cual está.
          const { error: dbError } = await supabase.from("gallery").update({ title, category, description, event_date: eventDate, published }).eq("id", item!.id);
          if (dbError) throw dbError;
        } else {
          if (videoState.phase !== "ready") throw new FileValidationError("Espera a que el video termine de optimizarse antes de publicar.");
          const { result } = videoState;

          const videoFile = new File([result.videoBlob], "video.mp4", { type: "video/mp4" });
          const thumbFile = new File([result.thumbnailBlob], "thumb.jpg", { type: "image/jpeg" });

          const [videoUrl, thumbUrl] = await Promise.all([
            uploadPublicFile(VIDEO_FOLDER, videoFile, "video"),
            uploadPublicFile(FOLDER, thumbFile, "image"),
          ]);

          const payload = {
            title, category, description, event_date: eventDate, published,
            media_type: "video" as const,
            image_url: thumbUrl,
            video_url: videoUrl,
            mime_type: result.mimeType,
            duration_seconds: result.durationSeconds,
            resolution: result.resolution,
            original_size_bytes: result.originalSizeBytes,
            optimized_size_bytes: result.optimizedSizeBytes,
            savings_percent: result.savingsPercent,
            youtube_id: null, youtube_url: null,
            order_index: 0,
          };
          const { error: dbError } = await supabase.from("gallery").insert(payload);
          if (dbError) throw dbError;
        }
      } else {
        if (!parsedYoutube) throw new FileValidationError("Pega una URL válida de YouTube.");

        const payload = {
          title, category, description, event_date: eventDate, published,
          media_type: "youtube" as const,
          image_url: parsedYoutube.thumbnailUrl,
          video_url: null, mime_type: null, duration_seconds: null, resolution: null,
          original_size_bytes: null, optimized_size_bytes: null, savings_percent: null,
          youtube_id: parsedYoutube.id,
          youtube_url: parsedYoutube.url,
        };
        const { error: dbError } = isEdit
          ? await supabase.from("gallery").update(payload).eq("id", item!.id)
          : await supabase.from("gallery").insert({ ...payload, order_index: 0 });
        if (dbError) throw dbError;
      }

      await supabase.rpc("log_audit", {
        p_action: isEdit ? "actualizar_galeria" : "crear_galeria",
        p_module: "galeria",
        p_entity: "gallery",
        p_entity_id: item?.id,
        p_details: { title, media_type: mediaKind, published },
      });

      // El reemplazo se sube primero y se borra despues -- la fila en BD ya
      // apunta al archivo nuevo antes de tocar Storage, para no dejar nunca
      // una referencia rota si algo falla a mitad de camino.
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
        setVideoState({ phase: "idle" });
        setYoutubeInput("");
        router.refresh();
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof FileValidationError ? err.message : err instanceof Error ? err.message : "No pudimos guardar el elemento de la galería.");
    }
  }

  const canSubmit = mediaKind !== "video" || isEdit || videoState.phase === "ready";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <FormField label="Tipo" htmlFor="media_kind" required>
          <Select
            id="media_kind"
            value={mediaKind}
            onChange={(e) => { setMediaKind(e.target.value as GalleryMediaType); setVideoState({ phase: "idle" }); }}
          >
            <option value="image">Fotografía</option>
            <option value="video">Video (se optimiza automáticamente)</option>
            <option value="youtube">Video de YouTube (por URL)</option>
          </Select>
        </FormField>
      )}

      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={item?.title} />
      </FormField>
      <FormField label="Categoría" htmlFor="category" required hint="Ej: Desfile Escolar 2026, Efemérides, Deportes — agrupa la galería pública">
        <Input id="category" name="category" required defaultValue={item?.category} />
      </FormField>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" defaultValue={item?.description ?? undefined} />
      </FormField>

      {mediaKind === "image" && (
        <FormField
          label={isEdit ? "Reemplazar imagen" : "Imagen"}
          htmlFor="image"
          required={!isEdit}
          hint={isEdit ? "Opcional — déjalo vacío para conservar la imagen actual." : "JPG, PNG o WEBP, máximo 5 MB."}
        >
          <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!isEdit} />
        </FormField>
      )}

      {mediaKind === "video" && !isEdit && (
        <FormField
          label="Video"
          htmlFor="video"
          hint="MP4 o WEBM. Se optimiza en tu navegador antes de subirse — el archivo original nunca se almacena."
        >
          <Input
            id="video"
            name="video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleVideoFileSelected(f); }}
          />

          {videoState.phase !== "idle" && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {(videoState.phase === "loading" || videoState.phase === "compressing" || videoState.phase === "thumbnail") && (
                <div>
                  <p className="font-medium text-slate-700">{PHASE_LABEL[videoState.phase]}{videoState.phase === "compressing" ? ` ${videoState.percent}%` : ""}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-brand-600 transition-all" style={{ width: `${videoState.phase === "compressing" ? videoState.percent : 15}%` }} />
                  </div>
                </div>
              )}
              {videoState.phase === "ready" && (
                <div className="flex items-start gap-2 text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Video optimizado</p>
                    <p className="text-xs text-slate-600">
                      Original: {formatMb(videoState.result.originalSizeBytes)} · Optimizado: {formatMb(videoState.result.optimizedSizeBytes)} · Ahorro: {videoState.result.savingsPercent}%
                      {videoState.result.resolution && ` · ${videoState.result.resolution}`}
                    </p>
                  </div>
                </div>
              )}
              {videoState.phase === "too_large" && (
                <div className="flex items-start gap-2 text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Este video sigue siendo demasiado pesado para la galería ({formatMb(videoState.sizeBytes)}, máximo {formatMb(MAX_OPTIMIZED_SIZE_BYTES)}).
                    Recomendamos publicarlo en YouTube y agregar el enlace.
                  </p>
                </div>
              )}
              {videoState.phase === "error" && (
                <div className="flex items-start gap-2 text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{videoState.message}</p>
                </div>
              )}
            </div>
          )}
        </FormField>
      )}
      {mediaKind === "video" && isEdit && (
        <p className="text-xs text-slate-500">El video de una publicación existente no se puede reemplazar aquí — elimina y crea una nueva.</p>
      )}

      {mediaKind === "youtube" && (
        <FormField label="URL de YouTube" htmlFor="youtube" required hint="Ej: https://www.youtube.com/watch?v=...">
          <Input id="youtube" name="youtube" type="url" required value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          {youtubeInput && (
            parsedYoutube ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                <YoutubeIcon className="h-4 w-4" /> Video reconocido — ID {parsedYoutube.id}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="h-4 w-4" /> No reconocemos esta URL como un video de YouTube válido.
              </div>
            )
          )}
        </FormField>
      )}

      <FormField label="Fecha" htmlFor="event_date" hint="Opcional">
        <Input id="event_date" name="event_date" type="date" defaultValue={item?.event_date ?? undefined} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Visible en el sitio público
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading || !canSubmit}>
        {mediaKind === "youtube" ? <YoutubeIcon className="h-4 w-4" /> : mediaKind === "video" ? <UploadCloud className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar a la galería"}
      </Button>
    </form>
  );
}
