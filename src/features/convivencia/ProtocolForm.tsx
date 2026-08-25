"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { DocumentRow } from "@/types/database";

/** Administración simple del catálogo de protocolos institucionales (punto
 * 13). No inventa procedimientos: solo registra los que la dirección
 * carga, opcionalmente enlazados a un documento ya subido en Documentos. */
export function ProtocolForm({ documents }: { documents: DocumentRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const payload = {
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      reference_document_id: String(form.get("reference_document_id") || "") || null,
    };
    if (!payload.name) {
      setLoading(false);
      setError("Ingresa el nombre del protocolo.");
      return;
    }

    const { data: protocol, error: insertError } = await supabase.from("convivencia_protocols").insert(payload).select("id").single();
    if (insertError || !protocol) {
      setLoading(false);
      setError("No pudimos guardar el protocolo.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "crear_protocolo",
      p_module: "convivencia",
      p_entity: "convivencia_protocols",
      p_entity_id: protocol.id,
      p_details: { name: payload.name },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo protocolo
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <FormField label="Nombre" htmlFor="name" required hint="Usa el nombre exacto del Reglamento Interno.">
        <Input id="name" name="name" required />
      </FormField>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" rows={2} />
      </FormField>
      <FormField label="Documento asociado" htmlFor="reference_document_id" hint="Opcional — desde Documentos">
        <Select id="reference_document_id" name="reference_document_id" defaultValue="">
          <option value="">Sin documento asociado</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </Select>
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar protocolo"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
