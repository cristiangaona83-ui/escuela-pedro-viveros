"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { ScheduleBlock } from "@/services/school-config";

/** Horario de ESTUDIANTES (entrada/salida) mostrado en Inicio -- distinto
 * del horario de ATENCIÓN de Contacto (ver ContactExtrasForm). */
export function HomeScheduleForm({ blocks }: { blocks: ScheduleBlock[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const str = (name: string) => String(form.get(name) || "").trim();

    const value = {
      blocks: blocks.map((_, i) => ({
        label: str(`label_${i}`),
        entrada: str(`entrada_${i}`),
        salida: str(`salida_${i}`),
      })),
    };

    const supabase = createClient();
    const { error: dbError } = await supabase.from("school_config").upsert({ key: "home_schedule", value, is_public: true }, { onConflict: "key" });

    if (!dbError) {
      await supabase.rpc("log_audit", { p_action: "actualizar_contenido_sitio", p_module: "sitio-web", p_entity: "school_config", p_entity_id: "home_schedule" });
    }

    setLoading(false);
    if (dbError) { setError("No pudimos guardar el horario."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {blocks.map((b, i) => (
        <div key={i} className="grid gap-4 sm:grid-cols-3">
          <FormField label="Días" htmlFor={`label_${i}`} required>
            <Input id={`label_${i}`} name={`label_${i}`} required defaultValue={b.label} />
          </FormField>
          <FormField label="Entrada" htmlFor={`entrada_${i}`} required>
            <Input id={`entrada_${i}`} name={`entrada_${i}`} required defaultValue={b.entrada} />
          </FormField>
          <FormField label="Salida" htmlFor={`salida_${i}`} required>
            <Input id={`salida_${i}`} name={`salida_${i}`} required defaultValue={b.salida} />
          </FormField>
        </div>
      ))}
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Guardado.</div>}
      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
