"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function DocumentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    const { error: dbError } = await supabase.from("documents").insert({
      title: String(form.get("title") || ""),
      category: String(form.get("category") || ""),
      year: form.get("year") ? Number(form.get("year")) : null,
      description: String(form.get("description") || "") || null,
      file_url: String(form.get("file_url") || ""),
      is_public: form.get("is_public") === "on",
      uploaded_by: authData.user?.id,
    });

    setLoading(false);
    if (dbError) { setError("No pudimos guardar el documento."); return; }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Categoría" htmlFor="category" required hint="Ej: PEI, Reglamento, Circular">
          <Input id="category" name="category" required />
        </FormField>
        <FormField label="Año" htmlFor="year" hint="Opcional">
          <Input id="year" name="year" type="number" />
        </FormField>
      </div>
      <FormField label="Enlace del archivo (PDF)" htmlFor="file_url" required hint="URL pública desde Supabase Storage u otro alojamiento">
        <Input id="file_url" name="file_url" type="url" required />
      </FormField>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="is_public" defaultChecked className="h-4 w-4 rounded border-slate-300" />
        Visible en el sitio público
      </label>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <Button type="submit" size="sm" disabled={loading}><UploadCloud className="h-4 w-4" /> Publicar documento</Button>
    </form>
  );
}
