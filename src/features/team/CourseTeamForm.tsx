"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { CourseTeamRow } from "@/types/database";

export function CourseTeamForm({ item, redirectTo }: { item?: CourseTeamRow; redirectTo: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(item?.active ?? true);
  const isEdit = Boolean(item);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      course_name: String(form.get("course_name") || "").trim(),
      order_index: Number(form.get("order_index") || 0),
      active,
    };
    if (!payload.course_name) {
      setLoading(false);
      setError("Ingresa el nombre del curso.");
      return;
    }

    const supabase = createClient();
    const { error: dbError } = isEdit
      ? await supabase.from("course_teams").update(payload).eq("id", item!.id)
      : await supabase.from("course_teams").insert(payload);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar el curso.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_curso_equipo" : "crear_curso_equipo",
      p_module: "equipo-institucional",
      p_entity: "course_teams",
      p_entity_id: item?.id,
      p_details: { course_name: payload.course_name },
    });

    setLoading(false);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del curso" htmlFor="course_name" required hint='Ej: "Prekínder", "1° Básico"'>
        <Input id="course_name" name="course_name" required defaultValue={item?.course_name} />
      </FormField>
      <FormField label="Orden de aparición" htmlFor="order_index" hint="Número menor aparece primero.">
        <Input id="order_index" name="order_index" type="number" defaultValue={item?.order_index ?? 0} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Visible en el sitio público
      </label>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear curso"}
      </Button>
    </form>
  );
}
