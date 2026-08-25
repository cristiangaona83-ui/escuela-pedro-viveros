"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

/** Acciones preventivas y formativas (punto 14) — no atadas a un caso. */
export function PreventiveActionForm({ courses }: { courses: { id: string; level: string; letter: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  function toggleCourse(id: string) {
    setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

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
      activity: String(form.get("activity") || "").trim(),
      objective: String(form.get("objective") || "").trim() || null,
      action_date: String(form.get("action_date") || ""),
      participants: String(form.get("participants") || "").trim() || null,
      evidence: String(form.get("evidence") || "").trim() || null,
      evaluation: String(form.get("evaluation") || "").trim() || null,
      result: String(form.get("result") || "").trim() || null,
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!payload.activity || !payload.action_date) {
      setLoading(false);
      setError("Completa el nombre de la actividad y la fecha.");
      return;
    }

    const { data: action, error: insertError } = await supabase.from("convivencia_preventive_actions").insert(payload).select("id").single();
    if (insertError || !action) {
      setLoading(false);
      setError("No pudimos guardar la acción preventiva.");
      return;
    }

    if (selectedCourses.length > 0) {
      await supabase
        .from("convivencia_preventive_action_courses")
        .insert(selectedCourses.map((courseId) => ({ preventive_action_id: action.id, course_id: courseId })));
    }

    await supabase.rpc("log_audit", {
      p_action: "crear_accion_preventiva",
      p_module: "convivencia",
      p_entity: "convivencia_preventive_actions",
      p_entity_id: action.id,
      p_details: { activity: payload.activity },
    });

    setLoading(false);
    router.push("/plataforma/convivencia/preventivas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Actividad" htmlFor="activity" required>
        <Input id="activity" name="activity" required />
      </FormField>
      <FormField label="Objetivo" htmlFor="objective">
        <Textarea id="objective" name="objective" rows={2} />
      </FormField>
      <FormField label="Fecha" htmlFor="action_date" required>
        <Input id="action_date" name="action_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </FormField>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Curso(s)</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={selectedCourses.includes(c.id)} onChange={() => toggleCourse(c.id)} className="h-3.5 w-3.5 rounded border-slate-300" />
              {c.level} {c.letter}
            </label>
          ))}
        </div>
      </div>

      <FormField label="Participantes" htmlFor="participants" hint="Opcional">
        <Textarea id="participants" name="participants" rows={2} />
      </FormField>
      <FormField label="Evidencia" htmlFor="evidence" hint="Opcional">
        <Textarea id="evidence" name="evidence" rows={2} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Evaluación" htmlFor="evaluation" hint="Opcional">
          <Textarea id="evaluation" name="evaluation" rows={2} />
        </FormField>
        <FormField label="Resultado" htmlFor="result" hint="Opcional">
          <Textarea id="result" name="result" rows={2} />
        </FormField>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar acción preventiva"}
      </Button>
    </form>
  );
}
