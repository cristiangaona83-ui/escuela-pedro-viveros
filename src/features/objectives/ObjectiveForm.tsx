"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { LearningObjectiveRow } from "@/types/database";

const LEVELS = [
  "Prekínder", "Kínder",
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico",
];

export function ObjectiveForm({
  objective,
  subjectOptions,
}: {
  objective?: LearningObjectiveRow;
  subjectOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(objective);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const payload = {
      subject_id: String(form.get("subject_id") || ""),
      level: String(form.get("level") || ""),
      code: String(form.get("code") || "").toUpperCase().trim(),
      description: String(form.get("description") || "").trim(),
    };

    const { error: dbError } = isEdit
      ? await supabase.from("learning_objectives").update(payload).eq("id", objective!.id)
      : await supabase.from("learning_objectives").insert(payload);

    if (dbError) {
      setLoading(false);
      setError(dbError.code === "23505" ? "Ya existe un OA con ese código para esa asignatura y nivel." : "No pudimos guardar el objetivo.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_objetivo_aprendizaje" : "crear_objetivo_aprendizaje",
      p_module: "objetivos",
      p_entity: "learning_objectives",
      p_entity_id: objective?.id,
      p_details: { code: payload.code, level: payload.level },
    });

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/objetivos");
    } else {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Asignatura" htmlFor="subject_id" required>
        <Select id="subject_id" name="subject_id" required defaultValue={objective?.subject_id}>
          <option value="">Selecciona…</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Nivel" htmlFor="level" required>
        <Select id="level" name="level" required defaultValue={objective?.level}>
          <option value="">Selecciona…</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Código" htmlFor="code" required hint="Ej: MA01OA01">
        <Input id="code" name="code" required defaultValue={objective?.code} />
      </FormField>
      <FormField label="Descripción" htmlFor="description" required hint="Redacción textual del objetivo de aprendizaje validado.">
        <Textarea id="description" name="description" required defaultValue={objective?.description} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar objetivo"}
      </Button>
    </form>
  );
}
