"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function SubjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("subjects").insert({
      code: String(form.get("code") || "").toUpperCase().trim(),
      name: String(form.get("name") || "").trim(),
    });
    setLoading(false);
    if (dbError) {
      setError("No pudimos crear la asignatura. El código podría estar repetido.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Código" htmlFor="code" required hint="Ej: FIL">
        <Input id="code" name="code" required maxLength={10} />
      </FormField>
      <FormField label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" required />
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Plus className="h-4 w-4" /> Agregar
      </Button>
    </form>
  );
}
