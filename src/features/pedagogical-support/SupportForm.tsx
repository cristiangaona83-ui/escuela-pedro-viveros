"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentSupportWithRelations } from "@/services/pedagogical-support";
import type { StudentSupportRow } from "@/types/database";

interface StudentOption {
  id: string;
  label: string;
}

const STATUS_OPTIONS = [
  { value: "en_seguimiento", label: "En seguimiento" },
  { value: "resuelto", label: "Resuelto" },
  { value: "derivado", label: "Derivado" },
];

export function SupportForm({
  record,
  studentOptions,
  subjectOptions,
  currentUserId,
}: {
  record?: StudentSupportWithRelations;
  studentOptions: StudentOption[];
  subjectOptions: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(record);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const payload = {
      student_id: String(form.get("student_id") || ""),
      subject_id: String(form.get("subject_id") || "") || null,
      difficulty: String(form.get("difficulty") || "").trim() || null,
      strength: String(form.get("strength") || "").trim() || null,
      action: String(form.get("action") || "").trim() || null,
      follow_up: String(form.get("follow_up") || "").trim() || null,
      status: String(form.get("status") || "en_seguimiento") as StudentSupportRow["status"],
      event_date: String(form.get("event_date") || "") || undefined,
      responsible_id: record?.responsible_id ?? currentUserId,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("student_support").update(payload).eq("id", record!.id)
      : await supabase.from("student_support").insert(payload);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar el registro de seguimiento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_seguimiento" : "crear_seguimiento",
      p_module: "seguimiento",
      p_entity: "student_support",
      p_entity_id: record?.id,
      p_details: { student_id: payload.student_id, status: payload.status },
    });

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/seguimiento");
    } else {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Estudiante" htmlFor="student_id" required>
        <Select id="student_id" name="student_id" required disabled={isEdit} defaultValue={record?.student_id}>
          <option value="">Selecciona…</option>
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Asignatura" htmlFor="subject_id" hint="Opcional">
        <Select id="subject_id" name="subject_id" defaultValue={record?.subject_id ?? ""}>
          <option value="">Sin asignatura específica</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Dificultad" htmlFor="difficulty">
        <Textarea id="difficulty" name="difficulty" defaultValue={record?.difficulty ?? undefined} />
      </FormField>
      <FormField label="Fortaleza" htmlFor="strength">
        <Textarea id="strength" name="strength" defaultValue={record?.strength ?? undefined} />
      </FormField>
      <FormField label="Acción" htmlFor="action">
        <Textarea id="action" name="action" defaultValue={record?.action ?? undefined} />
      </FormField>
      <FormField label="Seguimiento realizado" htmlFor="follow_up" hint="Opcional">
        <Textarea id="follow_up" name="follow_up" defaultValue={record?.follow_up ?? undefined} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Estado" htmlFor="status" required>
          <Select id="status" name="status" required defaultValue={record?.status ?? "en_seguimiento"}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Fecha" htmlFor="event_date">
          <Input id="event_date" name="event_date" type="date" defaultValue={record?.event_date} />
        </FormField>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar seguimiento"}
      </Button>
    </form>
  );
}
