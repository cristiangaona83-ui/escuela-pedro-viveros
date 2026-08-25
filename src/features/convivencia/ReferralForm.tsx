"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { ConvivenciaReferralType } from "@/types/database";

/** Derivaciones internas/externas (punto 11). Solo visible para
 * director/superadmin/convivencia -- la página que renderiza este
 * formulario ya filtra por rol antes de mostrarlo. */
export function ReferralForm({ caseId }: { caseId: string }) {
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
      referral_date: String(form.get("referral_date") || ""),
      referral_type: String(form.get("referral_type") || "interna") as ConvivenciaReferralType,
      institution: String(form.get("institution") || "").trim(),
      reason: String(form.get("reason") || "").trim(),
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!payload.referral_date || !payload.institution || !payload.reason) {
      setLoading(false);
      setError("Completa fecha, institución/red y motivo.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_referrals").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos registrar la derivación.");
      return;
    }

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_date: payload.referral_date,
      event_type: "derivacion",
      observation: `Derivación ${payload.referral_type} a ${payload.institution}.`,
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "registrar_derivacion",
      p_module: "convivencia",
      p_entity: "convivencia_referrals",
      p_entity_id: caseId,
      p_details: { institution: payload.institution },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Registrar derivación
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Fecha" htmlFor="referral_date" required>
          <Input id="referral_date" name="referral_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Tipo" htmlFor="referral_type" required>
          <Select id="referral_type" name="referral_type" defaultValue="interna">
            <option value="interna">Interna</option>
            <option value="externa">Externa</option>
          </Select>
        </FormField>
        <FormField label="Institución / red" htmlFor="institution" required>
          <Input id="institution" name="institution" required />
        </FormField>
      </div>
      <FormField label="Motivo" htmlFor="reason" required>
        <Textarea id="reason" name="reason" required rows={2} />
      </FormField>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar derivación"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
