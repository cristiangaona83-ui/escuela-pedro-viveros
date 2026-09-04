"use client";

import { useState, type FormEvent } from "react";
import { Save, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { EvaluationListItem } from "@/services/grade-overview";
import type { EvaluationRow } from "@/types/database";

const EVAL_TYPE_OPTIONS = [
  { value: "sumativa", label: "Sumativa" },
  { value: "formativa", label: "Formativa" },
];

const STATUS_OPTIONS: { value: EvaluationRow["status"]; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "planificada", label: "Planificada" },
  { value: "aplicada", label: "Aplicada / Publicada" },
  { value: "cerrada", label: "Cerrada" },
  { value: "archivada", label: "Archivada" },
];

/**
 * Crear/editar evaluación -- escritura directa a `evaluations` (UTP ya tiene
 * control total vía RLS `is_academic_management()`, sin necesidad de RPC).
 * No permite cambiar curso/asignatura de una evaluación existente: sus
 * calificaciones ya están ligadas a estudiantes de ESE curso -- cambiarlo
 * dejaría notas de estudiantes que ni siquiera pertenecen a la nueva
 * combinación. Curso/asignatura se fijan por el contexto donde se abre este
 * modal (siempre dentro de "Gestionar evaluaciones" de un curso+asignatura).
 */
export function EvaluationFormModal({
  open,
  onClose,
  onSaved,
  courseId,
  subjectId,
  periodId,
  userId,
  evaluation,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  courseId: string;
  subjectId: string;
  periodId: string;
  userId: string;
  evaluation?: EvaluationListItem;
}) {
  const showToast = useToast();
  const isEdit = Boolean(evaluation);
  const hasGrades = (evaluation?.gradedCount ?? 0) > 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const payload = {
      name: String(form.get("name") || "").trim(),
      eval_type: String(form.get("eval_type") || "sumativa"),
      // Con notas registradas, la ponderación queda protegida: el campo se
      // deshabilita en el formulario y aquí se ignora cualquier valor que
      // igual llegara en el FormData, para no depender solo de la UI --
      // el trigger de base de datos (0041) igual la rechazaría.
      weight: hasGrades ? evaluation!.weight : Number(form.get("weight") || 1),
      eval_date: String(form.get("eval_date") || "") || null,
      description: String(form.get("description") || "").trim() || null,
      status: String(form.get("status") || "borrador") as EvaluationRow["status"],
    };

    if (!payload.name) {
      setLoading(false);
      setError("Ingresa el nombre de la evaluación.");
      return;
    }

    const supabase = createClient();
    const { error: dbError } = isEdit
      ? await supabase.from("evaluations").update(payload).eq("id", evaluation!.id)
      : await supabase.from("evaluations").insert({
          ...payload,
          course_id: courseId,
          subject_id: subjectId,
          period_id: periodId,
          teacher_id: userId,
        });

    if (dbError) {
      setLoading(false);
      setError(dbError.message || "No pudimos guardar la evaluación.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_evaluacion" : "crear_evaluacion",
      p_module: "calificaciones",
      p_entity: "evaluations",
      p_entity_id: evaluation?.id,
      p_details: { name: payload.name, status: payload.status },
    });

    setLoading(false);
    showToast("success", isEdit ? "Evaluación actualizada correctamente." : "Evaluación creada.");
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar evaluación" : "Nueva evaluación"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {hasGrades && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Esta evaluación ya tiene <strong>{evaluation!.gradedCount}</strong> calificación{evaluation!.gradedCount === 1 ? "" : "es"}{" "}
              registrada{evaluation!.gradedCount === 1 ? "" : "s"}. Puedes editar nombre, descripción, fecha, tipo y estado con libertad; la
              ponderación queda protegida para no alterar el significado de las notas ya existentes.
            </p>
          </div>
        )}
        <FormField label="Nombre" htmlFor="name" required>
          <Input id="name" name="name" required defaultValue={evaluation?.name} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo" htmlFor="eval_type" required>
            <Select id="eval_type" name="eval_type" defaultValue={evaluation?.evalType ?? "sumativa"}>
              {EVAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Ponderación"
            htmlFor="weight"
            required
            hint={hasGrades ? "No se puede modificar: esta evaluación ya tiene calificaciones registradas." : "Peso relativo dentro del promedio"}
          >
            <Input id="weight" name="weight" type="number" step="0.1" min="0.1" required defaultValue={evaluation?.weight ?? 1} disabled={hasGrades} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fecha" htmlFor="eval_date" hint="Opcional">
            <Input id="eval_date" name="eval_date" type="date" defaultValue={evaluation?.evalDate ?? undefined} />
          </FormField>
          <FormField label="Estado" htmlFor="status" required>
            <Select id="status" name="status" defaultValue={evaluation?.status ?? "borrador"}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Descripción / observaciones" htmlFor="description" hint="Opcional">
          <Textarea id="description" name="description" defaultValue={evaluation?.description ?? undefined} />
        </FormField>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
