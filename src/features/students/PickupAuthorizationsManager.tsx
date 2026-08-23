"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentPickupAuthorizationRow } from "@/types/database";

export function PickupAuthorizationsManager({
  studentId,
  authorizations,
  canWrite,
}: {
  studentId: string;
  authorizations: StudentPickupAuthorizationRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim();
    if (!full_name) return;
    const payload = {
      student_id: studentId,
      full_name,
      relationship: String(form.get("relationship") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("student_pickup_authorizations")
      .insert(payload)
      .select("id")
      .single();
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "agregar_autorizado_retiro",
        p_module: "estudiantes",
        p_entity: "student_pickup_authorizations",
        p_entity_id: data.id,
        p_details: { student_id: studentId, full_name },
      });
    }
    setBusy(false);
    if (dbError) {
      setError("No pudimos agregar a esta persona.");
      return;
    }
    setShowAdd(false);
    router.refresh();
  }

  async function deactivate(id: string, name: string) {
    if (!window.confirm(`¿Quitar a ${name} de las personas autorizadas para retirar?`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("student_pickup_authorizations")
      .update({ active: false })
      .eq("id", id);
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "quitar_autorizado_retiro",
        p_module: "estudiantes",
        p_entity: "student_pickup_authorizations",
        p_entity_id: id,
        p_details: { student_id: studentId, name },
      });
    }
    setBusy(false);
    if (dbError) {
      window.alert("No pudimos quitar a esta persona.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <UserCheck className="h-4 w-4 text-slate-400" /> Personas autorizadas para retirar
          </h2>
          {canWrite && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)} disabled={busy}>
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          )}
        </div>

        {authorizations.length === 0 && !showAdd && (
          <p className="mt-3 text-sm text-slate-500">Sin personas autorizadas registradas.</p>
        )}

        <ul className="mt-3 divide-y divide-slate-100">
          {authorizations.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
              <div>
                <p className="font-medium text-slate-800">{a.full_name}</p>
                <p className="text-xs text-slate-500">
                  {a.relationship || "Vínculo no indicado"} · {a.phone || "sin teléfono"}
                </p>
                {a.notes && <p className="text-xs text-slate-400">{a.notes}</p>}
              </div>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => deactivate(a.id, a.full_name)}
                  disabled={busy}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"
                  aria-label="Quitar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {showAdd && (
          <form onSubmit={handleAdd} className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <FormField label="Nombre completo" htmlFor="pa_full_name" required>
                <Input id="pa_full_name" name="full_name" required />
              </FormField>
              <FormField label="Vínculo" htmlFor="pa_relationship">
                <Input id="pa_relationship" name="relationship" />
              </FormField>
              <FormField label="Teléfono" htmlFor="pa_phone">
                <Input id="pa_phone" name="phone" />
              </FormField>
              <FormField label="Observaciones" htmlFor="pa_notes">
                <Input id="pa_notes" name="notes" />
              </FormField>
            </div>
            {error && <p className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Agregar"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} disabled={busy}>Cancelar</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
