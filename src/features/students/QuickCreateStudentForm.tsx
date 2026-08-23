"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface YearOption {
  id: string;
  year: number;
}
interface CourseOption {
  course_id: string;
  course_label: string;
}

export function QuickCreateStudentForm({ years, courses }: { years: YearOption[]; courses: CourseOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const { data, error: rpcError } = await supabase.rpc("create_student_with_enrollment", {
      p_first_names: String(form.get("first_names") || "").trim(),
      p_last_names: String(form.get("last_names") || "").trim(),
      p_run: String(form.get("run") || "").trim(),
      p_birth_date: String(form.get("birth_date") || "") || null,
      p_course_id: String(form.get("course_id") || ""),
      p_academic_year_id: String(form.get("academic_year_id") || ""),
    });

    setLoading(false);
    if (rpcError) {
      setError(
        rpcError.code === "23505"
          ? "Ya existe un estudiante registrado con ese RUN."
          : rpcError.message || "No pudimos crear el estudiante."
      );
      return;
    }

    router.push(`/plataforma/estudiantes/${data}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombres" htmlFor="first_names" required>
          <Input id="first_names" name="first_names" required />
        </FormField>
        <FormField label="Apellidos" htmlFor="last_names" required>
          <Input id="last_names" name="last_names" required />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="RUN" htmlFor="run" required hint="Formato: 12345678-9">
          <Input id="run" name="run" required />
        </FormField>
        <FormField label="Fecha de nacimiento" htmlFor="birth_date">
          <Input id="birth_date" name="birth_date" type="date" />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Año" htmlFor="academic_year_id" required>
          <Select id="academic_year_id" name="academic_year_id" required defaultValue="">
            <option value="" disabled>Selecciona…</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.year}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Curso" htmlFor="course_id" required>
          <Select id="course_id" name="course_id" required defaultValue="">
            <option value="" disabled>Selecciona…</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_label}</option>
            ))}
          </Select>
        </FormField>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Crear estudiante y matricular"}
      </Button>
    </form>
  );
}
