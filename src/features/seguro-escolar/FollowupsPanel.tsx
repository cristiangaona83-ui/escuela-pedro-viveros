"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { SEGURO_ESCOLAR_FOLLOWUP_STATUS_LABELS } from "@/features/seguro-escolar/labels";
import type { FollowupListItem } from "@/services/seguro-escolar";
import type { SeguroEscolarFollowupStatus } from "@/types/database";

const STATUS_TONE: Record<SeguroEscolarFollowupStatus, "neutral" | "success" | "danger"> = {
  pendiente: "neutral",
  realizado: "success",
  cancelado: "danger",
};

/** Seguimiento del accidente -- expediente interno de gestión, separado del
 * formulario oficial 0374-3 (no forma parte del PDF). */
export function FollowupsPanel({ declarationId, canManage, followups }: { declarationId: string; canManage: boolean; followups: FollowupListItem[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const followupDate = String(form.get("followup_date") || "");
    if (!followupDate) {
      setError("Indica la fecha del seguimiento.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("seguro_escolar_followups")
      .insert({
        declaration_id: declarationId,
        followup_date: followupDate,
        responsible_id: user.id,
        information_received: String(form.get("information_received") || "").trim() || null,
        reincorporation_date: String(form.get("reincorporation_date") || "") || null,
        observation: String(form.get("observation") || "").trim() || null,
        status: String(form.get("status") || "pendiente") as SeguroEscolarFollowupStatus,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setLoading(false);
      setError(insertError?.message || "No pudimos registrar el seguimiento.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "registrar_seguimiento_seguro_escolar",
      p_module: "seguro_escolar",
      p_entity: "seguro_escolar_followups",
      p_entity_id: inserted.id,
      p_details: { declaration_id: declarationId },
    });

    setLoading(false);
    setFormOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && !formOpen && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar seguimiento
          </Button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Fecha" htmlFor="followup_date" required>
              <Input id="followup_date" name="followup_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
            <FormField label="Reincorporación" htmlFor="reincorporation_date" hint="Opcional">
              <Input id="reincorporation_date" name="reincorporation_date" type="date" />
            </FormField>
            <FormField label="Estado" htmlFor="status" required>
              <Select id="status" name="status" defaultValue="pendiente">
                {Object.entries(SEGURO_ESCOLAR_FOLLOWUP_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Información recibida" htmlFor="information_received" hint="Opcional">
            <Textarea id="information_received" name="information_received" rows={2} />
          </FormField>
          <FormField label="Observación" htmlFor="observation" hint="Opcional">
            <Textarea id="observation" name="observation" rows={2} />
          </FormField>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      )}

      {followups.length > 0 ? (
        <ul className="space-y-2">
          {followups.map((f) => (
            <li key={f.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{formatDate(f.followup_date)}</span>
                <Badge tone={STATUS_TONE[f.status]}>{SEGURO_ESCOLAR_FOLLOWUP_STATUS_LABELS[f.status]}</Badge>
              </div>
              {f.information_received && <p className="mt-1 text-sm text-slate-600">{f.information_received}</p>}
              {f.reincorporation_date && <p className="mt-1 text-xs text-slate-500">Reincorporación: {formatDate(f.reincorporation_date)}</p>}
              {f.observation && <p className="mt-1 text-sm text-slate-600">{f.observation}</p>}
              {f.responsibleName && <p className="mt-1 text-xs text-slate-400">Responsable: {f.responsibleName}</p>}
            </li>
          ))}
        </ul>
      ) : (
        !formOpen && <EmptyState icon={Activity} title="Sin seguimientos registrados" />
      )}
    </div>
  );
}
