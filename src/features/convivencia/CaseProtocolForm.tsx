"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { ConvivenciaProtocolRow } from "@/types/database";

/** Activar protocolo en un caso (punto 7). No inventa procedimientos: solo
 * asocia el caso a un protocolo ya cargado en el catálogo institucional. */
export function CaseProtocolForm({ caseId, protocols }: { caseId: string; protocols: ConvivenciaProtocolRow[] }) {
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

    const protocolId = String(form.get("protocol_id") || "");
    const payload = {
      case_id: caseId,
      protocol_id: protocolId,
      activated_at: String(form.get("activated_at") || ""),
      stage: String(form.get("stage") || "").trim() || null,
      deadline: String(form.get("deadline") || "") || null,
      actions_pending: String(form.get("actions_pending") || "").trim() || null,
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!protocolId || !payload.activated_at) {
      setLoading(false);
      setError("Selecciona un protocolo y la fecha de activación.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_case_protocols").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos activar el protocolo.");
      return;
    }

    await supabase.from("convivencia_cases").update({ status: "protocolo_activo" }).eq("id", caseId);

    const protocolName = protocols.find((p) => p.id === protocolId)?.name ?? "Protocolo";
    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_date: payload.activated_at,
      event_type: "protocolo",
      observation: `${protocolName} activado.`,
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "activar_protocolo",
      p_module: "convivencia",
      p_entity: "convivencia_case_protocols",
      p_entity_id: caseId,
      p_details: { protocol_id: protocolId },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (protocols.length === 0) return null;

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Activar protocolo
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <FormField label="Protocolo" htmlFor="protocol_id" required>
        <Select id="protocol_id" name="protocol_id" required defaultValue="">
          <option value="" disabled>
            Selecciona…
          </option>
          {protocols.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Fecha de activación" htmlFor="activated_at" required>
          <Input id="activated_at" name="activated_at" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Plazo" htmlFor="deadline" hint="Opcional">
          <Input id="deadline" name="deadline" type="date" />
        </FormField>
      </div>
      <FormField label="Etapa actual" htmlFor="stage" hint="Opcional">
        <Input id="stage" name="stage" />
      </FormField>
      <FormField label="Acciones pendientes" htmlFor="actions_pending" hint="Opcional">
        <Textarea id="actions_pending" name="actions_pending" rows={2} />
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Activando…" : "Activar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
