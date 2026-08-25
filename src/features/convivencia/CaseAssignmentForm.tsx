"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, AlertCircle } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { PersonName } from "@/services/convivencia";

/** Asigna acceso operativo del caso a un profesional de Inspectoría
 * General (0026: convivencia_case_assignments). Sin esta asignación
 * explícita, inspectoria_general no ve el caso. Solo director/
 * convivencia/superadmin pueden asignar (la página ya filtra por rol). */
export function CaseAssignmentForm({
  caseId,
  inspectoria,
  assignments,
}: {
  caseId: string;
  inspectoria: PersonName[];
  assignments: { id: string; profile_id: string; profile_name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  const available = inspectoria.filter((p) => !assignments.some((a) => a.profile_id === p.id));

  async function handleAssign() {
    if (!selected) return;
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

    const { error: insertError } = await supabase
      .from("convivencia_case_assignments")
      .insert({ case_id: caseId, profile_id: selected, assigned_by: user.id });
    if (insertError) {
      setLoading(false);
      setError("No pudimos asignar el caso.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "asignar_caso_convivencia",
      p_module: "convivencia",
      p_entity: "convivencia_case_assignments",
      p_entity_id: caseId,
      p_details: { profile_id: selected },
    });

    setLoading(false);
    setSelected("");
    router.refresh();
  }

  async function handleRemove(assignmentId: string) {
    if (!window.confirm("¿Quitar el acceso operativo de esta persona a este caso?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("convivencia_case_assignments").delete().eq("id", assignmentId);
    await supabase.rpc("log_audit", {
      p_action: "quitar_asignacion_convivencia",
      p_module: "convivencia",
      p_entity: "convivencia_case_assignments",
      p_entity_id: caseId,
      p_details: {},
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      {assignments.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
              <span>{a.profile_name}</span>
              <button type="button" onClick={() => handleRemove(a.id)} className="text-slate-400 hover:text-red-600" aria-label="Quitar">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
            <option value="">Asignar a Inspectoría…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={handleAssign} disabled={!selected || loading}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
