"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, deletePrivateFile, FileValidationError } from "@/lib/supabase/storage";

/**
 * Timbre institucional -- a diferencia de SignatureUploadForm (que crea una
 * fila nueva por cada firma, para conservar historial), este formulario
 * reemplaza el único registro: sube el archivo nuevo, upsertea la fila
 * `school_config` (key "institutional_stamp") y recién después borra el
 * archivo anterior de Storage -- así nunca queda una referencia rota si
 * algo falla a mitad de camino. Sube a la misma carpeta "firmas/" que ya
 * usan las firmas del Director/docentes (mismas políticas de Storage, sin
 * agregar ninguna).
 */
export function StampUploadForm({ hasStamp, previousPath }: { hasStamp: boolean; previousPath: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) {
      setLoading(false);
      setError("Selecciona una imagen del timbre.");
      return;
    }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    let storagePath: string;
    try {
      storagePath = await uploadPrivateFile("firmas/timbre", file, "stamp");
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir el timbre.");
      return;
    }

    const { error: upsertError } = await supabase.from("school_config").upsert(
      {
        key: "institutional_stamp",
        value: {
          storage_path: storagePath,
          bucket: "archivos-internos",
          uploaded_at: new Date().toISOString(),
          uploaded_by: authData.user?.id ?? null,
        },
        is_public: false,
        updated_by: authData.user?.id,
      },
      { onConflict: "key" }
    );

    if (upsertError) {
      setLoading(false);
      setError("El timbre se subió, pero no pudimos registrarlo. Contacta a soporte antes de reintentar para no dejar archivos huérfanos.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: hasStamp ? "reemplazar_timbre" : "subir_timbre",
      p_module: "firmas",
      p_entity: "school_config",
      p_entity_id: "institutional_stamp",
      p_details: { storage_path: storagePath },
    });

    if (previousPath) void deletePrivateFile(previousPath);

    setLoading(false);
    setSaved(true);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Imagen del timbre"
        htmlFor="stamp_file"
        required
        hint="PNG, JPG, JPEG o WEBP. Máximo 3 MB. Se prefiere PNG con fondo transparente."
      >
        <Input id="stamp_file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Timbre {hasStamp ? "reemplazado" : "adjuntado"}.
        </div>
      )}

      <Button type="submit" size="sm" disabled={loading}>
        <UploadCloud className="h-4 w-4" /> {loading ? "Subiendo…" : hasStamp ? "Reemplazar timbre" : "Adjuntar timbre"}
      </Button>
    </form>
  );
}
