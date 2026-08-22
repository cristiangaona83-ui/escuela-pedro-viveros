"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { CourseSubjectOption } from "@/services/academic-scope";
import type { LearningObjectiveWithSubject } from "@/services/learning-objectives";
import type { LessonPlanWithRelations } from "@/services/lesson-plans";

interface TeacherOption {
  id: string;
  full_name: string;
}

export function LessonPlanForm({
  plan,
  courseSubjectOptions,
  objectives,
  teacherOptions,
  currentUserId,
}: {
  plan?: LessonPlanWithRelations;
  courseSubjectOptions: CourseSubjectOption[];
  objectives: LearningObjectiveWithSubject[];
  teacherOptions?: TeacherOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"borrador" | "enviada" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState(plan?.subject_id ?? "");
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(
    plan?.lesson_plan_objectives.map((o) => o.learning_objective_id) ?? []
  );
  const isEdit = Boolean(plan);

  const visibleObjectives = useMemo(
    () => objectives.filter((o) => o.subject_id === subjectId || selectedObjectives.includes(o.id)),
    [objectives, subjectId, selectedObjectives]
  );

  function toggleObjective(id: string) {
    setSelectedObjectives((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const targetStatus: "borrador" | "enviada" = submitter?.value === "enviada" ? "enviada" : "borrador";
    setLoading(targetStatus);
    setError(null);
    const form = new FormData(event.currentTarget);
    const [course_id, subject_id] = String(form.get("course_subject") || "").split("::");

    if (!course_id || !subject_id) {
      setLoading(null);
      setError("Selecciona un curso y asignatura.");
      return;
    }

    const teacher_id = teacherOptions ? String(form.get("teacher_id") || "") : currentUserId;
    if (!teacher_id) {
      setLoading(null);
      setError("Selecciona el docente responsable.");
      return;
    }

    const payload = {
      teacher_id,
      course_id,
      subject_id,
      unit: String(form.get("unit") || "").trim(),
      plan_date: String(form.get("plan_date") || "") || null,
      objective: String(form.get("objective") || "").trim() || null,
      activities: String(form.get("activities") || "").trim() || null,
      evaluation_desc: String(form.get("evaluation_desc") || "").trim() || null,
      resources: String(form.get("resources") || "").trim() || null,
      observations: String(form.get("observations") || "").trim() || null,
      status: targetStatus,
    };

    const supabase = createClient();
    const { data: saved, error: dbError } = isEdit
      ? await supabase.from("lesson_plans").update(payload).eq("id", plan!.id).select("id").maybeSingle()
      : await supabase.from("lesson_plans").insert(payload).select("id").maybeSingle();

    if (dbError || !saved) {
      setLoading(null);
      setError(dbError?.message?.includes("dirección o UTP") ? dbError.message : "No pudimos guardar la planificación.");
      return;
    }

    const { error: linkError } = await supabase
      .from("lesson_plan_objectives")
      .delete()
      .eq("lesson_plan_id", saved.id);
    if (!linkError && selectedObjectives.length > 0) {
      await supabase
        .from("lesson_plan_objectives")
        .insert(selectedObjectives.map((learning_objective_id) => ({ lesson_plan_id: saved.id, learning_objective_id })));
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_planificacion" : "crear_planificacion",
      p_module: "planificaciones",
      p_entity: "lesson_plans",
      p_entity_id: saved.id,
      p_details: { unit: payload.unit, status: payload.status },
    });

    setLoading(null);
    router.push(`/plataforma/planificaciones/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {teacherOptions && (
        <FormField label="Docente responsable" htmlFor="teacher_id" required>
          <Select id="teacher_id" name="teacher_id" required defaultValue={plan?.teacher_id ?? ""}>
            <option value="" disabled>Selecciona…</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Curso y asignatura" htmlFor="course_subject" required>
        <Select
          id="course_subject"
          name="course_subject"
          required
          defaultValue={plan ? `${plan.course_id}::${plan.subject_id}` : ""}
          onChange={(e) => setSubjectId(e.target.value.split("::")[1] ?? "")}
        >
          <option value="" disabled>Selecciona…</option>
          {courseSubjectOptions.map((o) => (
            <option key={`${o.course_id}::${o.subject_id}`} value={`${o.course_id}::${o.subject_id}`}>
              {o.course_label} — {o.subject_name}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Unidad" htmlFor="unit" required>
          <Input id="unit" name="unit" required defaultValue={plan?.unit} />
        </FormField>
        <FormField label="Fecha" htmlFor="plan_date">
          <Input id="plan_date" name="plan_date" type="date" defaultValue={plan?.plan_date ?? undefined} />
        </FormField>
      </div>

      <FormField label="Objetivo de la clase" htmlFor="objective" hint="Redacción propia para esta clase específica.">
        <Textarea id="objective" name="objective" defaultValue={plan?.objective ?? undefined} />
      </FormField>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">OA asociados</label>
        {visibleObjectives.length > 0 ? (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {visibleObjectives.map((o) => (
              <label key={o.id} className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  checked={selectedObjectives.includes(o.id)}
                  onChange={() => toggleObjective(o.id)}
                />
                <span><span className="font-medium">{o.code}</span> — {o.description}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            {subjectId ? "No hay OA cargados para esta asignatura todavía." : "Selecciona primero un curso y asignatura."}
          </p>
        )}
      </div>

      <FormField label="Actividades" htmlFor="activities">
        <Textarea id="activities" name="activities" defaultValue={plan?.activities ?? undefined} />
      </FormField>
      <FormField label="Evaluación" htmlFor="evaluation_desc">
        <Textarea id="evaluation_desc" name="evaluation_desc" defaultValue={plan?.evaluation_desc ?? undefined} />
      </FormField>
      <FormField label="Recursos" htmlFor="resources">
        <Textarea id="resources" name="resources" defaultValue={plan?.resources ?? undefined} />
      </FormField>
      <FormField label="Observaciones" htmlFor="observations">
        <Textarea id="observations" name="observations" defaultValue={plan?.observations ?? undefined} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="borrador" variant="secondary" disabled={loading !== null}>
          <Save className="h-4 w-4" /> {loading === "borrador" ? "Guardando…" : "Guardar borrador"}
        </Button>
        <Button type="submit" name="intent" value="enviada" disabled={loading !== null}>
          <Send className="h-4 w-4" /> {loading === "enviada" ? "Enviando…" : "Enviar a revisión"}
        </Button>
      </div>
    </form>
  );
}
