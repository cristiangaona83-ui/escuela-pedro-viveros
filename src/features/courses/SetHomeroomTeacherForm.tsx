"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface TeacherOption {
  id: string;
  full_name: string;
}

export function SetHomeroomTeacherForm({
  courseId,
  courseLabel,
  currentTeacherId,
  teachers,
}: {
  courseId: string;
  courseLabel: string;
  currentTeacherId: string | null;
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const teacherId = String(form.get("homeroom_teacher_id") || "") || null;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const previousTeacherId = currentTeacherId;
    const { error: dbError } = await supabase
      .from("courses")
      .update({ homeroom_teacher_id: teacherId })
      .eq("id", courseId);

    if (dbError) {
      setLoading(false);
      console.error("courses.homeroom_teacher_id update error", dbError);
      setError(
        [
          "No pudimos guardar la jefatura.",
          dbError.code ? `Código: ${dbError.code}.` : null,
          dbError.message ? `Mensaje: ${dbError.message}.` : null,
        ]
          .filter(Boolean)
          .join(" ")
      );
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "cambiar_jefatura",
      p_module: "cursos",
      p_entity: "courses",
      p_entity_id: courseId,
      p_details: { course: courseLabel, previous_teacher_id: previousTeacherId, new_teacher_id: teacherId },
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
        aria-label={`Cambiar jefatura de ${courseLabel}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3">
      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-slate-600">Profesor/a jefe</label>
        <Select name="homeroom_teacher_id" defaultValue={currentTeacherId ?? ""}>
          <option value="">Sin asignar</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </Select>
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
