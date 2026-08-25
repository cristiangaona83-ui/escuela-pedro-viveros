"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

/** Seguimientos programables (punto 13). */
export function FollowupForm({ caseId }: { caseId: string }) {
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
      followup_date: String(form.get("followup_date") || ""),
      objective: String(form.get("objective") || "").trim() || null,
      result: String(form.get("result") || "").trim() || null,
      next_date: String(form.get("next_date") || "") || null,
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!payload.followup_date) {
      setLoading(false);
      setError("Ingresa la fecha del seguimiento.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_followups").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos guardar el seguimiento.");
      return;
    }

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_date: payload.followup_date,
      event_type: "seguimiento",
      observation: payload.objective ?? "Seguimiento registrado.",
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "agregar_seguimiento",
      p_module: "convivencia",
      p_entity: "convivencia_followups",
      p_entity_id: caseId,
      p_details: { followup_date: payload.followup_date },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar seguimiento
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Fecha" htmlFor="followup_date" required>
          <Input id="followup_date" name="followup_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Próxima fecha" htmlFor="next_date" hint="Opcional">
          <Input id="next_date" name="next_date" type="date" />
        </FormField>
      </div>
      <FormField label="Objetivo" htmlFor="objective">
        <Textarea id="objective" name="objective" rows={2} />
      </FormField>
      <FormField label="Resultado" htmlFor="result" hint="Opcional">
        <Textarea id="result" name="result" rows={2} />
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar seguimiento"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
