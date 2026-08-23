"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { FormField, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

/** Alerta administrativa mínima — nunca detalle judicial/confidencial. */
export function PickupRestrictionManager({
  studentId,
  note,
  canWrite,
}: {
  studentId: string;
  note: string | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const hasRestriction = note !== null;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get("note") || "").trim();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("student_pickup_restrictions")
      .upsert({ student_id: studentId, note: value || "Restricción registrada — ver antecedentes en Inspectoría/Dirección." });
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "registrar_restriccion_retiro",
        p_module: "estudiantes",
        p_entity: "student_pickup_restrictions",
        p_entity_id: studentId,
      });
    }
    setBusy(false);
    if (dbError) {
      setError("No pudimos guardar la restricción.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function clearRestriction() {
    if (!window.confirm("¿Quitar la restricción de retiro registrada para este estudiante?")) return;
    setBusy(true);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("student_pickup_restrictions").delete().eq("student_id", studentId);
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "quitar_restriccion_retiro",
        p_module: "estudiantes",
        p_entity: "student_pickup_restrictions",
        p_entity_id: studentId,
      });
    }
    setBusy(false);
    if (dbError) {
      window.alert("No pudimos quitar la restricción.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className={hasRestriction ? "border-red-200" : undefined}>
      <CardBody>
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <ShieldAlert className={hasRestriction ? "h-4 w-4 text-red-500" : "h-4 w-4 text-slate-400"} /> Restricción de retiro
        </h2>

        {hasRestriction ? (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <p className="font-medium">Existe una restricción de retiro registrada.</p>
            {note && <p className="mt-1 text-xs text-red-700">{note}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Sin restricciones de retiro registradas.</p>
        )}

        {canWrite && !editing && (
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy}>
              {hasRestriction ? "Editar" : "Registrar restricción"}
            </Button>
            {hasRestriction && (
              <Button type="button" variant="ghost" size="sm" onClick={clearRestriction} disabled={busy}>
                Quitar
              </Button>
            )}
          </div>
        )}

        {canWrite && editing && (
          <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
            <FormField label="Nota administrativa breve" htmlFor="restriction_note" hint="Sin detalle judicial o confidencial — solo lo mínimo para alertar en la ficha">
              <Textarea id="restriction_note" name="note" defaultValue={note ?? ""} />
            </FormField>
            {error && <p className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>Cancelar</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
