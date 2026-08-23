"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { AUTHORIZATION_TYPES, authorizationLabel } from "@/config/student-authorizations";
import type { StudentAuthorizationRow } from "@/types/database";

export function StudentAuthorizationsManager({
  studentId,
  authorizations,
  canWrite,
}: {
  studentId: string;
  authorizations: StudentAuthorizationRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upsert(authType: string, authorized: boolean, observation: string | null) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("student_authorizations")
      .upsert(
        { student_id: studentId, auth_type: authType, authorized, authorized_at: new Date().toISOString().slice(0, 10), observation },
        { onConflict: "student_id,auth_type" }
      );
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "registrar_autorizacion",
        p_module: "estudiantes",
        p_entity: "student_authorizations",
        p_entity_id: studentId,
        p_details: { auth_type: authType, authorized },
      });
    }
    setBusy(false);
    if (dbError) {
      setError("No pudimos guardar la autorización.");
      return false;
    }
    return true;
  }

  async function toggle(row: StudentAuthorizationRow) {
    const ok = await upsert(row.auth_type, !row.authorized, row.observation);
    if (ok) router.refresh();
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const authType = String(form.get("auth_type") || "").trim();
    if (!authType) return;
    const authorized = form.get("authorized") === "on";
    const observation = String(form.get("observation") || "").trim() || null;
    const ok = await upsert(authType, authorized, observation);
    if (ok) {
      setShowAdd(false);
      router.refresh();
    }
  }

  const usedTypes = new Set(authorizations.map((a) => a.auth_type));

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <FileCheck2 className="h-4 w-4 text-slate-400" /> Autorizaciones administrativas
          </h2>
          {canWrite && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)} disabled={busy}>
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          )}
        </div>

        {authorizations.length === 0 && !showAdd && <p className="mt-3 text-sm text-slate-500">Sin autorizaciones registradas.</p>}

        <ul className="mt-3 divide-y divide-slate-100">
          {authorizations.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <p className="font-medium text-slate-800">{authorizationLabel(a.auth_type)}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(a.authorized_at)}
                  {a.observation && ` · ${a.observation}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={a.authorized ? "success" : "danger"}>{a.authorized ? "Autorizado" : "No autorizado"}</Badge>
                {canWrite && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => toggle(a)} disabled={busy}>
                    Cambiar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {showAdd && (
          <form onSubmit={handleAdd} className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <FormField label="Tipo de autorización" htmlFor="auth_type" required>
                <Select id="auth_type" name="auth_type" required defaultValue="">
                  <option value="" disabled>Selecciona un tipo…</option>
                  {AUTHORIZATION_TYPES.filter((t) => !usedTypes.has(t.code)).map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                  <option value="otro">Otro (especificar en observación)</option>
                </Select>
              </FormField>
              <FormField label="Observación" htmlFor="observation">
                <Input id="observation" name="observation" />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="authorized" defaultChecked className="h-4 w-4 rounded border-slate-300" />
              Autorizado
            </label>
            {error && <p className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} disabled={busy}>Cancelar</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
