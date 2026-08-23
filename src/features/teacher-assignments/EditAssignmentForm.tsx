"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Select, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface TeacherOption {
  id: string;
  full_name: string;
}

export function EditAssignmentForm({
  assignmentId,
  currentTeacherId,
  currentHours,
  teachers,
  label,
}: {
  assignmentId: string;
  currentTeacherId: string;
  currentHours: number | null;
  teachers: TeacherOption[];
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const teacher_id = String(form.get("teacher_id") || "");
    const hoursRaw = String(form.get("weekly_hours") || "").trim();
    const weekly_hours = hoursRaw ? Number(hoursRaw) : null;
    if (!teacher_id) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("teacher_assignments")
      .update({ teacher_id, weekly_hours })
      .eq("id", assignmentId);

    if (dbError) {
      setLoading(false);
      setError(
        dbError.code === "23505"
          ? "Ese docente ya tiene esta misma asignatura asignada en este curso."
          : "No pudimos guardar el cambio."
      );
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "editar_asignacion_docente",
      p_module: "carga_docente",
      p_entity: "teacher_assignments",
      p_entity_id: assignmentId,
      p_details: { label, new_teacher_id: teacher_id, weekly_hours },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Editar ${label}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3">
      <div className="w-48">
        <FormField label="Docente responsable" htmlFor={`teacher_id_${assignmentId}`}>
          <Select id={`teacher_id_${assignmentId}`} name="teacher_id" defaultValue={currentTeacherId}>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="w-28">
        <FormField label="Horas/sem." htmlFor={`hours_${assignmentId}`}>
          <Input id={`hours_${assignmentId}`} name="weekly_hours" type="number" min={1} defaultValue={currentHours ?? undefined} />
        </FormField>
      </div>
      <Button type="submit" size="sm" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
      {error && (
        <div className="flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </form>
  );
}
