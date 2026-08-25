"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { PLAN_STATUS_LABELS } from "@/features/convivencia/labels";
import type { ConvivenciaPlanStatus } from "@/types/database";

/** Plan de Gestión de Convivencia Educativa (punto 15). */
export function ManagementPlanForm({ academicYearId }: { academicYearId: string }) {
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
      academic_year_id: academicYearId,
      action: String(form.get("action") || "").trim(),
      objective: String(form.get("objective") || "").trim() || null,
      indicator: String(form.get("indicator") || "").trim() || null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      status: String(form.get("status") || "planificada") as ConvivenciaPlanStatus,
      progress_percent: Number(form.get("progress_percent") || 0),
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!payload.action) {
      setLoading(false);
      setError("Ingresa la acción.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_management_plan").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos guardar la acción del plan.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "crear_accion_plan_gestion",
      p_module: "convivencia",
      p_entity: "convivencia_management_plan",
      p_details: { action: payload.action },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nueva acción del plan
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <FormField label="Acción" htmlFor="action" required>
        <Input id="action" name="action" required />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Objetivo" htmlFor="objective">
          <Textarea id="objective" name="objective" rows={2} />
        </FormField>
        <FormField label="Indicador" htmlFor="indicator">
          <Textarea id="indicator" name="indicator" rows={2} />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <FormField label="Inicio" htmlFor="start_date">
          <Input id="start_date" name="start_date" type="date" />
        </FormField>
        <FormField label="Término" htmlFor="end_date">
          <Input id="end_date" name="end_date" type="date" />
        </FormField>
        <FormField label="Estado" htmlFor="status">
          <Select id="status" name="status" defaultValue="planificada">
            {Object.entries(PLAN_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="% Avance" htmlFor="progress_percent">
          <Input id="progress_percent" name="progress_percent" type="number" min={0} max={100} defaultValue={0} />
        </FormField>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
