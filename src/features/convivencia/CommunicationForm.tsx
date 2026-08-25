"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { GuardianOption } from "@/features/convivencia/InterviewForm";
import type { ConvivenciaCommType } from "@/types/database";

/** Contacto con apoderados (punto 12) — reutiliza los apoderados reales del
 * estudiante (guardians), nunca datos nuevos. */
export function CommunicationForm({ caseId, guardians }: { caseId: string; guardians: GuardianOption[] }) {
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
      comm_date: String(form.get("comm_date") || ""),
      comm_type: String(form.get("comm_type") || "llamada") as ConvivenciaCommType,
      guardian_id: String(form.get("guardian_id") || ""),
      reason: String(form.get("reason") || "").trim() || null,
      result: String(form.get("result") || "").trim() || null,
      agreements: String(form.get("agreements") || "").trim() || null,
      next_action: String(form.get("next_action") || "").trim() || null,
      staff_id: user.id,
      created_by: user.id,
    };
    if (!payload.comm_date || !payload.guardian_id) {
      setLoading(false);
      setError("Completa fecha y apoderado.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_communications").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos registrar la comunicación.");
      return;
    }

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_date: payload.comm_date,
      event_type: "contacto_apoderado",
      observation: payload.reason ?? "Contacto con apoderado registrado.",
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "registrar_comunicacion",
      p_module: "convivencia",
      p_entity: "convivencia_communications",
      p_entity_id: caseId,
      p_details: { comm_type: payload.comm_type },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Registrar comunicación
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Fecha" htmlFor="comm_date" required>
          <Input id="comm_date" name="comm_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Tipo" htmlFor="comm_type" required>
          <Select id="comm_type" name="comm_type" defaultValue="llamada">
            <option value="llamada">Llamada</option>
            <option value="correo">Correo</option>
            <option value="entrevista">Entrevista</option>
            <option value="citacion">Citación</option>
            <option value="otro">Otro</option>
          </Select>
        </FormField>
        <FormField label="Apoderado" htmlFor="guardian_id" required>
          <Select id="guardian_id" name="guardian_id" required defaultValue="">
            <option value="" disabled>
              Selecciona…
            </option>
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name} ({g.studentLabel})
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Motivo" htmlFor="reason">
        <Textarea id="reason" name="reason" rows={2} />
      </FormField>
      <FormField label="Resultado" htmlFor="result">
        <Textarea id="result" name="result" rows={2} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Acuerdos" htmlFor="agreements">
          <Textarea id="agreements" name="agreements" rows={2} />
        </FormField>
        <FormField label="Próxima acción" htmlFor="next_action">
          <Textarea id="next_action" name="next_action" rows={2} />
        </FormField>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar comunicación"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
