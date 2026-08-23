"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Select, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface Option {
  id: string;
  label: string;
}

export function NewTeacherAssignmentForm({
  academicYearId,
  courses,
  subjects,
  teachers,
}: {
  academicYearId: string;
  courses: Option[];
  subjects: Option[];
  teachers: Option[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const courseId = String(form.get("course_id") || "");
    const subjectId = String(form.get("subject_id") || "");
    const teacherId = String(form.get("teacher_id") || "");
    const hoursRaw = String(form.get("weekly_hours") || "").trim();
    const weeklyHours = hoursRaw ? Number(hoursRaw) : null;

    if (!courseId || !subjectId || !teacherId) {
      setLoading(false);
      setError("Selecciona curso, asignatura y docente.");
      return;
    }
    if (weeklyHours !== null && (!Number.isFinite(weeklyHours) || weeklyHours <= 0)) {
      setLoading(false);
      setError("Las horas semanales deben ser un número mayor a 0, o dejar el campo vacío.");
      return;
    }

    const supabase = createClient();
    const { error: dbError } = await supabase.from("teacher_assignments").insert({
      academic_year_id: academicYearId,
      course_id: courseId,
      subject_id: subjectId,
      teacher_id: teacherId,
      weekly_hours: weeklyHours,
    });

    setLoading(false);
    if (dbError) {
      console.error("teacher_assignments insert error", dbError);
      if (dbError.code === "23505") {
        setError("Ese docente ya tiene esta asignatura asignada en este curso.");
      } else {
        setError(
          [
            "No pudimos crear la asignación.",
            dbError.code ? `Código: ${dbError.code}.` : null,
            dbError.message ? `Mensaje: ${dbError.message}.` : null,
            dbError.details ? `Detalle: ${dbError.details}.` : null,
            dbError.hint ? `Sugerencia: ${dbError.hint}.` : null,
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "crear_asignacion_docente",
      p_module: "carga_docente",
      p_entity: "teacher_assignments",
      p_details: { course_id: courseId, subject_id: subjectId, teacher_id: teacherId, weekly_hours: weeklyHours },
    });

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Curso" htmlFor="course_id" required>
        <Select id="course_id" name="course_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Asignatura" htmlFor="subject_id" required>
        <Select id="subject_id" name="subject_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Docente responsable" htmlFor="teacher_id" required>
        <Select id="teacher_id" name="teacher_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Horas semanales" htmlFor="weekly_hours" hint="Opcional">
        <Input id="weekly_hours" name="weekly_hours" type="number" min={1} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Asignar"}
      </Button>
    </form>
  );
}
