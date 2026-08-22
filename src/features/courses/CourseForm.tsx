"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { AcademicYearRow } from "@/types/database";

const LEVELS = [
  "Prekínder", "Kínder",
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico",
];

export function CourseForm({ academicYears }: { academicYears: AcademicYearRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      academic_year_id: String(form.get("academic_year_id") || ""),
      level: String(form.get("level") || ""),
      letter: String(form.get("letter") || "").toUpperCase(),
      description: String(form.get("description") || "") || null,
      public_visible: true,
    };

    const supabase = createClient();
    const { data, error: dbError } = await supabase.from("courses").insert(payload).select("id").single();
    setLoading(false);

    if (dbError) {
      setError("No pudimos crear el curso. Verifica que no exista uno igual para el mismo año.");
      return;
    }

    router.push(`/plataforma/cursos/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Año académico" htmlFor="academic_year_id" required>
        <Select id="academic_year_id" name="academic_year_id" required defaultValue="">
          <option value="" disabled>Selecciona un año</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nivel" htmlFor="level" required>
          <Select id="level" name="level" required defaultValue="">
            <option value="" disabled>Selecciona un nivel</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Letra" htmlFor="letter" hint="Ej: A, B">
          <Input id="letter" name="letter" maxLength={2} />
        </FormField>
      </div>
      <FormField label="Descripción" htmlFor="description" hint="Opcional, visible en el sitio público">
        <Textarea id="description" name="description" />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Crear curso"}
      </Button>
    </form>
  );
}
