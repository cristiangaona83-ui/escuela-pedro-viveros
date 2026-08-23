"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadCloud, X, Loader2, Check, AlertCircle, RotateCcw, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, deletePublicFile, pathFromPublicUrl, FileValidationError } from "@/lib/supabase/storage";

const FOLDER = "galeria";
const CONCURRENCY = 4;

type UploadStatus = "pending" | "uploading" | "done" | "error";

type FileItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  errorMessage?: string;
};

type Phase = "select" | "uploading" | "finished";

async function runPool(items: FileItem[], limit: number, worker: (item: FileItem) => Promise<void>) {
  let cursor = 0;
  async function next(): Promise<void> {
    const current = cursor++;
    if (current >= items.length) return;
    await worker(items[current]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

export function BulkGalleryUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [phase, setPhase] = useState<Phase>("select");
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [publishAll, setPublishAll] = useState(false);

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;

    const newItems: FileItem[] = picked.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newItems]);
    event.target.value = "";
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function updateStatus(id: string, status: UploadStatus, errorMessage?: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status, errorMessage } : f)));
  }

  async function uploadItem(item: FileItem, payloadBase: {
    title: string;
    category: string;
    description: string | null;
    event_date: string | null;
    published: boolean;
  }) {
    updateStatus(item.id, "uploading");
    const supabase = createClient();
    let imageUrl: string;
    try {
      imageUrl = await uploadPublicFile(FOLDER, item.file, "image");
    } catch (uploadError) {
      updateStatus(
        item.id,
        "error",
        uploadError instanceof FileValidationError ? uploadError.message : "No se pudo subir la imagen."
      );
      return;
    }

    const { error: dbError } = await supabase.from("gallery").insert({ ...payloadBase, image_url: imageUrl });
    if (dbError) {
      const path = pathFromPublicUrl(imageUrl);
      if (path) void deletePublicFile(path);
      updateStatus(item.id, "error", "Se subió la imagen pero no se pudo crear el registro en la galería.");
      return;
    }

    updateStatus(item.id, "done");
  }

  async function handleStartUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Ingresa el título de la actividad o álbum.");
      return;
    }
    if (!category.trim()) {
      setFormError("Ingresa una categoría (ej: Actividades, Efemérides, Deportes).");
      return;
    }
    if (files.length === 0) {
      setFormError("Selecciona al menos una fotografía.");
      return;
    }

    setPhase("uploading");

    const payloadBase = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim() || null,
      event_date: eventDate || null,
      published: publishAll,
    };

    await runPool(
      files.filter((f) => f.status === "pending"),
      CONCURRENCY,
      (item) => uploadItem(item, payloadBase)
    );

    const supabase = createClient();
    setFiles((current) => {
      const successCount = current.filter((f) => f.status === "done").length;
      const failedCount = current.filter((f) => f.status === "error").length;
      void supabase.rpc("log_audit", {
        p_action: "carga_masiva_galeria",
        p_module: "galeria",
        p_entity: "gallery",
        p_details: { title: payloadBase.title, category: payloadBase.category, total: current.length, exitosas: successCount, fallidas: failedCount, publicadas: publishAll },
      });
      return current;
    });

    setPhase("finished");
    router.refresh();
  }

  async function handleRetryFailed() {
    const failed = files.filter((f) => f.status === "error");
    if (failed.length === 0) return;

    setFiles((prev) => prev.map((f) => (f.status === "error" ? { ...f, status: "pending", errorMessage: undefined } : f)));
    setPhase("uploading");

    const payloadBase = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim() || null,
      event_date: eventDate || null,
      published: publishAll,
    };

    await runPool(failed, CONCURRENCY, (item) => uploadItem(item, payloadBase));

    setPhase("finished");
    router.refresh();
  }

  const total = files.length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const completedCount = doneCount + errorCount;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const isUploading = phase === "uploading";

  return (
    <div className="space-y-6">
      <form onSubmit={handleStartUpload} className="space-y-4">
        <FormField label="Título de la actividad / álbum" htmlFor="bulk-title" required hint="Se aplica a todas las fotografías seleccionadas. Ej: Desfile Escolar 2026">
          <Input id="bulk-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isUploading || phase === "finished"} required />
        </FormField>
        <FormField label="Categoría" htmlFor="bulk-category" required hint="Ej: Actividades, Efemérides, Deportes">
          <Input id="bulk-category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={isUploading || phase === "finished"} required />
        </FormField>
        <FormField label="Descripción" htmlFor="bulk-description" hint="Opcional — se aplica a todas.">
          <Textarea id="bulk-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading || phase === "finished"} />
        </FormField>
        <FormField label="Fecha" htmlFor="bulk-event_date" hint="Opcional — se aplica a todas.">
          <Input id="bulk-event_date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} disabled={isUploading || phase === "finished"} />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={publishAll}
            onChange={(e) => setPublishAll(e.target.checked)}
            disabled={isUploading || phase === "finished"}
            className="h-4 w-4 rounded border-slate-300"
          />
          Publicar todas al finalizar (quedarán visibles en el sitio público)
        </label>

        <FormField
          label="Fotografías"
          htmlFor="bulk-files"
          hint="JPG, PNG o WEBP, máximo 5 MB por fotografía. Si tienes fotos en formato HEIC (iPhone), conviértelas primero a JPG o PNG."
        >
          <input
            ref={fileInputRef}
            id="bulk-files"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesSelected}
            disabled={isUploading || phase === "finished"}
            className="block w-full rounded-lg border border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50"
          />
        </FormField>

        {files.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700">
              {total} fotografía{total === 1 ? "" : "s"} seleccionada{total === 1 ? "" : "s"}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {files.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  {phase === "select" && (
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Quitar de la selección"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {item.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  {item.status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/30">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {item.status === "error" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-red-900/40"
                      title={item.errorMessage}
                    >
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
          </div>
        )}

        {phase === "select" && (
          <Button type="submit" size="sm" disabled={files.length === 0}>
            <UploadCloud className="h-4 w-4" /> Subir {files.length > 0 ? `${files.length} fotografías` : "fotografías"}
          </Button>
        )}
      </form>

      {phase !== "select" && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {isUploading
                ? `Subiendo ${Math.min(completedCount + Math.max(uploadingCount, 1), total)} de ${total}…`
                : `${doneCount} de ${total} completadas`}
            </span>
            <span className="text-slate-500">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          {phase === "finished" && (
            <div className="space-y-3 pt-1">
              <p className="text-sm text-slate-600">
                {doneCount} fotografía{doneCount === 1 ? "" : "s"} cargada{doneCount === 1 ? "" : "s"} correctamente
                {errorCount > 0 && `, ${errorCount} fallaron`}.
              </p>

              {errorCount > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700">Fallaron:</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                    {files
                      .filter((f) => f.status === "error")
                      .map((f) => (
                        <li key={f.id}>
                          {f.file.name} — {f.errorMessage}
                        </li>
                      ))}
                  </ul>
                  <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={handleRetryFailed}>
                    <RotateCcw className="h-4 w-4" /> Reintentar fallidas ({errorCount})
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {errorCount === 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                      setFiles([]);
                      setTitle("");
                      setCategory("");
                      setDescription("");
                      setEventDate("");
                      setPublishAll(false);
                      setPhase("select");
                    }}
                  >
                    <ImagePlus className="h-4 w-4" /> Subir otra actividad
                  </Button>
                )}
                <Link
                  href="/plataforma/galeria"
                  className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Ver galería
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
