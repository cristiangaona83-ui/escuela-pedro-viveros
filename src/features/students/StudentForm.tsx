"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentRow } from "@/types/database";

export function StudentForm({ student }: { student?: StudentRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      first_names: String(form.get("first_names") || "").trim(),
      last_names: String(form.get("last_names") || "").trim(),
      run: String(form.get("run") || "").trim(),
      birth_date: String(form.get("birth_date") || "") || null,
      status: String(form.get("status") || "matriculado") as StudentRow["status"],
      notes: String(form.get("notes") || "") || null,
    };

    const supabase = createClient();
    const { data, error: dbError } = student
      ? await supabase.from("students").update(payload).eq("id", student.id).select("id").single()
      : await supabase.from("students").insert(payload).select("id").single();

    setLoading(false);
    if (dbError) {
      setError(
        dbError.code === "23505"
          ? "Ya existe un estudiante registrado con ese RUN."
          : "No pudimos guardar el estudiante. Verifica los datos."
      );
      return;
    }

    router.push(`/plataforma/estudiantes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombres" htmlFor="first_names" required>
          <Input id="first_names" name="first_names" defaultValue={student?.first_names} required />
        </FormField>
        <FormField label="Apellidos" htmlFor="last_names" required>
          <Input id="last_names" name="last_names" defaultValue={student?.last_names} required />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="RUN" htmlFor="run" required hint="Formato: 12345678-9">
          <Input id="run" name="run" defaultValue={student?.run} required />
        </FormField>
        <FormField label="Fecha de nacimiento" htmlFor="birth_date">
          <Input id="birth_date" name="birth_date" type="date" defaultValue={student?.birth_date ?? undefined} />
        </FormField>
      </div>
      <FormField label="Estado de matrícula" htmlFor="status" required>
        <Select id="status" name="status" defaultValue={student?.status ?? "matriculado"}>
          <option value="matriculado">Matriculado</option>
          <option value="retirado">Retirado</option>
          <option value="egresado">Egresado</option>
        </Select>
      </FormField>
      <FormField label="Observaciones administrativas" htmlFor="notes" hint="Opcional">
        <Input id="notes" name="notes" defaultValue={student?.notes ?? undefined} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar estudiante"}
      </Button>
    </form>
  );
}
