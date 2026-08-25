"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

/** Medidas y acuerdos (punto 10). No automatiza sanciones: solo registra lo
 * que el equipo de convivencia decide y su seguimiento de cumplimiento. */
export function MeasureForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const payload = {
      case_id: caseId,
      description: String(form.get("description") || "").trim(),
      start_date: String(form.get("start_date") || ""),
      review_date: String(form.get("review_date") || "") || null,
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!payload.description || !payload.start_date) {
      setLoading(false);
      setError("Ingresa la medida y la fecha de inicio.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_measures").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos guardar la medida.");
      return;
    }

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_date: payload.start_date,
      event_type: "medida",
      observation: payload.description,
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "agregar_medida",
      p_module: "convivencia",
      p_entity: "convivencia_measures",
      p_entity_id: caseId,
      p_details: { description: payload.description },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar medida
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <FormField label="Medida / acuerdo" htmlFor="description" required>
        <Textarea id="description" name="description" required rows={2} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Fecha de inicio" htmlFor="start_date" required>
          <Input id="start_date" name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Fecha de revisión" htmlFor="review_date" hint="Opcional">
          <Input id="review_date" name="review_date" type="date" />
        </FormField>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar medida"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
