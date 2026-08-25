"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { EVENT_TYPE_LABELS } from "@/features/convivencia/labels";
import type { ConvivenciaEventType } from "@/types/database";

/** Evento manual de la línea de tiempo (punto 8: "permitir agregar evento
 * manual autorizado"). Los demás eventos (entrevista, medida, derivación,
 * etc.) los crean automáticamente sus propios formularios. */
export function EventForm({ caseId }: { caseId: string }) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const payload = {
      case_id: caseId,
      event_date: String(form.get("event_date") || ""),
      event_time: String(form.get("event_time") || "") || null,
      event_type: String(form.get("event_type") || "otro") as ConvivenciaEventType,
      observation: String(form.get("observation") || "").trim() || null,
      created_by: user.id,
    };
    if (!payload.event_date) {
      setLoading(false);
      setError("Ingresa la fecha.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_events").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos agregar el evento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "agregar_evento_convivencia",
      p_module: "convivencia",
      p_entity: "convivencia_events",
      p_entity_id: caseId,
      p_details: { event_type: payload.event_type },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar evento
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Fecha" htmlFor="event_date" required>
          <Input id="event_date" name="event_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Hora" htmlFor="event_time" hint="Opcional">
          <Input id="event_time" name="event_time" type="time" />
        </FormField>
        <FormField label="Tipo" htmlFor="event_type" required>
          <Select id="event_type" name="event_type" defaultValue="otro">
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Descripción" htmlFor="observation">
        <Textarea id="observation" name="observation" rows={2} />
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar evento"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
