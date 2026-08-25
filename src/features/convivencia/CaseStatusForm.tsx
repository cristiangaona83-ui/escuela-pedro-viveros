"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea, Label } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS } from "@/features/convivencia/labels";
import type { ConvivenciaCaseStatus } from "@/types/database";

/** Cambia el estado del caso. Al pasar a "Cerrado" exige una conclusión,
 * que se guarda en convivencia_case_closures (tabla aparte, nunca visible
 * para inspectoria_general — ver 0026). El caso nunca se elimina, solo
 * cambia de estado (punto 23: no borrado físico). */
export function CaseStatusForm({ caseId, currentStatus }: { caseId: string; currentStatus: ConvivenciaCaseStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<ConvivenciaCaseStatus>(currentStatus);
  const [conclusion, setConclusion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (status === "cerrado" && !conclusion.trim()) {
      setError("Ingresa la conclusión para cerrar el caso.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const { error: updateError } = await supabase
      .from("convivencia_cases")
      .update({ status, closed_at: status === "cerrado" ? new Date().toISOString() : null })
      .eq("id", caseId);
    if (updateError) {
      setLoading(false);
      setError("No pudimos actualizar el estado.");
      return;
    }

    if (status === "cerrado") {
      const { error: closureError } = await supabase
        .from("convivencia_case_closures")
        .upsert({ case_id: caseId, conclusion: conclusion.trim(), closed_by: user.id, closed_at: new Date().toISOString() });
      if (closureError) {
        setLoading(false);
        setError("El estado se actualizó, pero no pudimos guardar la conclusión.");
        return;
      }
      await supabase.from("convivencia_events").insert({
        case_id: caseId,
        event_type: "caso_cerrado",
        observation: "Caso cerrado.",
        created_by: user.id,
      });
    }

    await supabase.rpc("log_audit", {
      p_action: "cambiar_estado_caso",
      p_module: "convivencia",
      p_entity: "convivencia_cases",
      p_entity_id: caseId,
      p_details: { status },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <Label htmlFor="status">Estado del caso</Label>
      <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as ConvivenciaCaseStatus)}>
        {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>

      {status === "cerrado" && (
        <div className="mt-3">
          <Label htmlFor="conclusion">Conclusión</Label>
          <Textarea id="conclusion" value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={3} />
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="button" size="sm" className="mt-3" onClick={handleSave} disabled={loading || status === currentStatus}>
        {loading ? "Guardando…" : "Actualizar estado"}
      </Button>
    </div>
  );
}
