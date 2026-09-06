"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import type { CircularListItem } from "@/services/documents";
import type { DocumentStatus } from "@/types/database";

/**
 * Edición de los datos de una Circular Informativa -- deliberadamente sin
 * campo de archivo: reemplazar el archivo es una acción aparte
 * ("Reemplazar archivo" en el menú ⋮, ver ReplaceCircularFileDialog), igual
 * que separa el pedido original. Por eso la visibilidad tampoco es editable
 * aquí -- depende de en qué bucket vive el archivo actual, y esta pantalla
 * nunca lo toca (mismo criterio de seguridad que ya usa DocumentForm.tsx
 * para el resto de Documentos).
 */
export function EditCircularModal({ open, onClose, circular }: { open: boolean; onClose: () => void; circular: CircularListItem }) {
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus>(circular.status);
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
    const supabase = createClient();

    const payload = {
      title: String(form.get("title") || circular.title),
      document_number: String(form.get("document_number") || "").trim() || null,
      document_date: String(form.get("document_date") || "") || null,
      year: form.get("year") ? Number(form.get("year")) : null,
      description: String(form.get("description") || "").trim() || null,
      status,
    };

    const { error: dbError } = await supabase.from("documents").update(payload).eq("id", circular.id);
    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar los cambios.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "editar_circular_informativa",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: circular.id,
      p_details: { title: payload.title, status: payload.status },
    });

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Editar Circular Informativa" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Número de circular" htmlFor="document_number" hint="Opcional">
            <Input id="document_number" name="document_number" defaultValue={circular.document_number ?? ""} />
          </FormField>
          <FormField label="Fecha" htmlFor="document_date" required>
            <Input id="document_date" name="document_date" type="date" required defaultValue={circular.document_date ?? ""} />
          </FormField>
        </div>
        <FormField label="Título" htmlFor="title" required>
          <Input id="title" name="title" required defaultValue={circular.title} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Año" htmlFor="year" required>
            <Input id="year" name="year" type="number" required defaultValue={circular.year ?? new Date().getFullYear()} />
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
          <Textarea id="description" name="description" rows={3} defaultValue={circular.description ?? ""} />
        </FormField>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Visibilidad actual:</span>
          <Badge tone={circular.is_public ? "success" : "neutral"}>{circular.is_public ? "Pública" : "Solo plataforma"}</Badge>
          <span className="text-xs text-slate-400">-- se cambia al reemplazar el archivo</span>
        </div>

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
            <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
