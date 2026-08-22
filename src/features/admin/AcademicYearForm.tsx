"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function AcademicYearForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const year = Number(form.get("year"));
    const supabase = createClient();

    const { data: newYear, error: yearError } = await supabase
      .from("academic_years")
      .insert({ year })
      .select("id")
      .single();

    if (yearError || !newYear) {
      setLoading(false);
      setError("No pudimos crear el año. Podría ya existir.");
      return;
    }

    await supabase.from("academic_periods").insert([
      { academic_year_id: newYear.id, name: "Primer Semestre", order_index: 1 },
      { academic_year_id: newYear.id, name: "Segundo Semestre", order_index: 2 },
    ]);

    setLoading(false);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <FormField label="Año académico" htmlFor="year" required>
          <Input id="year" name="year" type="number" required min={2020} max={2100} defaultValue={new Date().getFullYear()} />
        </FormField>
      </div>
      <Button type="submit" disabled={loading}>
        <Plus className="h-4 w-4" /> {loading ? "Creando…" : "Crear año"}
      </Button>
      {error && <span className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" /> {error}</span>}
    </form>
  );
}
