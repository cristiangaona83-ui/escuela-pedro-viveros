"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface YearOption {
  id: string;
  year: number;
}
interface CourseOption {
  course_id: string;
  course_label: string;
}

export function ReactivateStudentButton({
  studentId,
  years,
  courses,
}: {
  studentId: string;
  years: YearOption[];
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const academic_year_id = String(form.get("academic_year_id") || "");
    const course_id = String(form.get("course_id") || "");
    if (!academic_year_id || !course_id) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("reactivate_student", {
      p_student_id: studentId,
      p_course_id: course_id,
      p_academic_year_id: academic_year_id,
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message || "No pudimos reincorporar al estudiante.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
      >
        <UserCheck className="h-4 w-4" /> Reactivar / reincorporar
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>{loading ? "Guardando…" : "Confirmar"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
      </div>
    </form>
  );
}
