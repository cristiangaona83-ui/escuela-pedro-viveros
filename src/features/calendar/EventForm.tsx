"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { EventRow } from "@/types/database";

const EVENT_TYPES = [
  { value: "general", label: "General" },
  { value: "reunion", label: "Reunión" },
  { value: "consejo", label: "Consejo de profesores" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "actividad", label: "Actividad" },
  { value: "salida", label: "Salida educativa" },
  { value: "cierre_semestre", label: "Cierre de semestre" },
];

/** "2026-04-15T10:30:00+00:00" -> "2026-04-15T10:30", el formato que espera <input type="datetime-local">. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({
  event,
  courseOptions,
}: {
  event?: EventRow;
  courseOptions: { id: string; level: string; letter: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(event);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    const startAt = String(form.get("start_at") || "");
    const endAt = String(form.get("end_at") || "");

    const payload = {
      title: String(form.get("title") || ""),
      description: String(form.get("description") || "") || null,
      event_type: String(form.get("event_type") || "general"),
      start_at: startAt ? new Date(startAt).toISOString() : "",
      end_at: endAt ? new Date(endAt).toISOString() : null,
      course_id: String(form.get("course_id") || "") || null,
      created_by: authData.user?.id,
    };

    const { error: dbError, data: saved } = isEdit
      ? await supabase.from("events").update(payload).eq("id", event!.id).select("id").single()
      : await supabase.from("events").insert(payload).select("id").single();

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar el evento. Revisa la fecha de inicio.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_evento" : "crear_evento",
      p_module: "calendario",
      p_entity: "events",
      p_entity_id: saved?.id,
      p_details: { title: payload.title, start_at: payload.start_at },
    });

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/calendario");
    } else {
      e.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={event?.title} />
      </FormField>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" defaultValue={event?.description ?? undefined} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tipo" htmlFor="event_type">
          <Select id="event_type" name="event_type" defaultValue={event?.event_type ?? "general"}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Curso" htmlFor="course_id" hint="Opcional">
          <Select id="course_id" name="course_id" defaultValue={event?.course_id ?? ""}>
            <option value="">Todos / sin curso específico</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.level} {c.letter}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Inicio" htmlFor="start_at" required>
          <Input id="start_at" name="start_at" type="datetime-local" required defaultValue={toLocalInputValue(event?.start_at ?? null)} />
        </FormField>
        <FormField label="Término" htmlFor="end_at" hint="Opcional">
          <Input id="end_at" name="end_at" type="datetime-local" defaultValue={toLocalInputValue(event?.end_at ?? null)} />
        </FormField>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <Button type="submit" size="sm" disabled={loading}>
        <CalendarPlus className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear evento"}
      </Button>
    </form>
  );
}
