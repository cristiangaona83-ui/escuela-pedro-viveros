"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { ObservationWithRelations } from "@/services/classroom-observations";

interface TeacherOption {
  id: string;
  full_name: string;
}
interface CourseOption {
  id: string;
  level: string;
  letter: string;
}

export function ObservationForm({
  observation,
  teacherOptions,
  courseOptions,
  subjectOptions,
  currentUserId,
}: {
  observation?: ObservationWithRelations;
  teacherOptions: TeacherOption[];
  courseOptions: CourseOption[];
  subjectOptions: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(observation);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const payload = {
      teacher_id: String(form.get("teacher_id") || ""),
      course_id: String(form.get("course_id") || ""),
      subject_id: String(form.get("subject_id") || "") || null,
      obs_date: String(form.get("obs_date") || "") || undefined,
      focus: String(form.get("focus") || "").trim() || null,
      strengths: String(form.get("strengths") || "").trim() || null,
      opportunities: String(form.get("opportunities") || "").trim() || null,
      agreements: String(form.get("agreements") || "").trim() || null,
      follow_up: String(form.get("follow_up") || "").trim() || null,
      observer_id: observation?.observer_id ?? currentUserId,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("classroom_observations").update(payload).eq("id", observation!.id)
      : await supabase.from("classroom_observations").insert(payload);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar la observación.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_acompanamiento" : "crear_acompanamiento",
      p_module: "acompanamiento",
      p_entity: "classroom_observations",
      p_entity_id: observation?.id,
      p_details: { teacher_id: payload.teacher_id, course_id: payload.course_id },
    });

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/acompanamiento");
    } else {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Docente observado" htmlFor="teacher_id" required>
        <Select id="teacher_id" name="teacher_id" required disabled={isEdit} defaultValue={observation?.teacher_id}>
          <option value="">Selecciona…</option>
          {teacherOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Curso" htmlFor="course_id" required>
          <Select id="course_id" name="course_id" required defaultValue={observation?.course_id}>
            <option value="">Selecciona…</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.level} {c.letter}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Asignatura" htmlFor="subject_id" hint="Opcional">
          <Select id="subject_id" name="subject_id" defaultValue={observation?.subject_id ?? ""}>
            <option value="">Sin asignatura específica</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Fecha" htmlFor="obs_date">
        <Input id="obs_date" name="obs_date" type="date" defaultValue={observation?.obs_date} />
      </FormField>
      <FormField label="Foco de observación" htmlFor="focus">
        <Textarea id="focus" name="focus" defaultValue={observation?.focus ?? undefined} />
      </FormField>
      <FormField label="Fortalezas" htmlFor="strengths">
        <Textarea id="strengths" name="strengths" defaultValue={observation?.strengths ?? undefined} />
      </FormField>
      <FormField label="Oportunidades de mejora" htmlFor="opportunities">
        <Textarea id="opportunities" name="opportunities" defaultValue={observation?.opportunities ?? undefined} />
      </FormField>
      <FormField label="Acuerdos" htmlFor="agreements">
        <Textarea id="agreements" name="agreements" defaultValue={observation?.agreements ?? undefined} />
      </FormField>
      <FormField label="Seguimiento" htmlFor="follow_up" hint="Opcional">
        <Textarea id="follow_up" name="follow_up" defaultValue={observation?.follow_up ?? undefined} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar observación"}
      </Button>
    </form>
  );
}
