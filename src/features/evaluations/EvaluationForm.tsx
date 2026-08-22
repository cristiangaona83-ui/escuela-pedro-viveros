"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { CourseSubjectOption } from "@/services/academic-scope";
import type { AcademicPeriodRow } from "@/types/database";

export function EvaluationForm({
  options,
  periods,
  userId,
}: {
  options: CourseSubjectOption[];
  periods: (AcademicPeriodRow & { academic_years: { year: number } | null })[];
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const [course_id, subject_id] = String(form.get("course_subject") || "").split("::");

    const payload = {
      course_id,
      subject_id,
      period_id: String(form.get("period_id") || ""),
      teacher_id: userId,
      name: String(form.get("name") || "").trim(),
      eval_type: String(form.get("eval_type") || "sumativa"),
      weight: Number(form.get("weight") || 1),
      eval_date: String(form.get("eval_date") || "") || null,
      description: String(form.get("description") || "") || null,
    };

    const supabase = createClient();
    const { error: dbError } = await supabase.from("evaluations").insert(payload);
    setLoading(false);

    if (dbError) {
      setError("No pudimos crear la evaluación. Verifica que el período esté abierto.");
      return;
    }

    router.push("/plataforma/evaluaciones");
    router.refresh();
  }

  if (options.length === 0) {
    return <p className="text-sm text-slate-500">No tienes cursos y asignaturas asignados todavía.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Curso y asignatura" htmlFor="course_subject" required>
        <Select id="course_subject" name="course_subject" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {options.map((o) => (
            <option key={`${o.course_id}::${o.subject_id}`} value={`${o.course_id}::${o.subject_id}`}>
              {o.course_label} — {o.subject_name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Período" htmlFor="period_id" required>
        <Select id="period_id" name="period_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id} disabled={p.status === "cerrado"}>
              {p.academic_years?.year} · {p.name} {p.status === "cerrado" ? "(cerrado)" : ""}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Nombre de la evaluación" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="Prueba Unidad 2" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Tipo" htmlFor="eval_type">
          <Select id="eval_type" name="eval_type" defaultValue="sumativa">
            <option value="sumativa">Sumativa</option>
            <option value="formativa">Formativa</option>
            <option value="acumulativa">Acumulativa</option>
          </Select>
        </FormField>
        <FormField label="Ponderación" htmlFor="weight" hint="1.0 = 100%">
          <Input id="weight" name="weight" type="number" step="0.1" min="0" defaultValue="1" />
        </FormField>
        <FormField label="Fecha" htmlFor="eval_date">
          <Input id="eval_date" name="eval_date" type="date" />
        </FormField>
      </div>
      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Input id="description" name="description" />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Crear evaluación"}
      </Button>
    </form>
  );
}
