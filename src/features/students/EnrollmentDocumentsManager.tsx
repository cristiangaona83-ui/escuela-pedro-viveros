"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { ENROLLMENT_DOC_TYPES, enrollmentDocLabel, ENROLLMENT_DOC_STATUS_LABEL } from "@/config/student-authorizations";
import type { StudentEnrollmentDocumentRow } from "@/types/database";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  entregado: "success",
  solicitado: "warning",
  pendiente: "neutral",
};

export function EnrollmentDocumentsManager({
  studentId,
  documents,
  canWrite,
}: {
  studentId: string;
  documents: StudentEnrollmentDocumentRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upsert(
    docType: string,
    status: StudentEnrollmentDocumentRow["status"],
    docDate: string | null,
    observation: string | null
  ) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("student_enrollment_documents")
      .upsert({ student_id: studentId, doc_type: docType, status, doc_date: docDate, observation }, { onConflict: "student_id,doc_type" });
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "registrar_documento_matricula",
        p_module: "estudiantes",
        p_entity: "student_enrollment_documents",
        p_entity_id: studentId,
        p_details: { doc_type: docType, status },
      });
    }
    setBusy(false);
    if (dbError) {
      setError("No pudimos guardar el documento.");
      return false;
    }
    return true;
  }

  async function cycleStatus(row: StudentEnrollmentDocumentRow) {
    const next = row.status === "pendiente" ? "solicitado" : row.status === "solicitado" ? "entregado" : "pendiente";
    const docDate = next === "entregado" ? new Date().toISOString().slice(0, 10) : row.doc_date;
    const ok = await upsert(row.doc_type, next, docDate, row.observation);
    if (ok) router.refresh();
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const docType = String(form.get("doc_type") || "").trim();
    if (!docType) return;
    const status = String(form.get("status") || "pendiente") as StudentEnrollmentDocumentRow["status"];
    const observation = String(form.get("observation") || "").trim() || null;
    const ok = await upsert(docType, status, null, observation);
    if (ok) {
      setShowAdd(false);
      router.refresh();
    }
  }

  const usedTypes = new Set(documents.map((d) => d.doc_type));

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-slate-400" /> Documentación de matrícula
          </h2>
          {canWrite && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)} disabled={busy}>
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          )}
        </div>

        {documents.length === 0 && !showAdd && <p className="mt-3 text-sm text-slate-500">Sin documentos de matrícula registrados.</p>}

        <ul className="mt-3 divide-y divide-slate-100">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <p className="font-medium text-slate-800">{enrollmentDocLabel(d.doc_type)}</p>
                <p className="text-xs text-slate-500">
                  {d.doc_date ? formatDate(d.doc_date) : "Sin fecha"}
                  {d.observation && ` · ${d.observation}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[d.status]}>{ENROLLMENT_DOC_STATUS_LABEL[d.status] ?? d.status}</Badge>
                {canWrite && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => cycleStatus(d)} disabled={busy}>
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
              <FormField label="Documento" htmlFor="doc_type" required>
                <Select id="doc_type" name="doc_type" required defaultValue="">
                  <option value="" disabled>Selecciona un documento…</option>
                  {ENROLLMENT_DOC_TYPES.filter((t) => !usedTypes.has(t.code)).map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                  <option value="otro">Otro (especificar en observación)</option>
                </Select>
              </FormField>
              <FormField label="Estado" htmlFor="status">
                <Select id="status" name="status" defaultValue="pendiente">
                  <option value="pendiente">Pendiente</option>
                  <option value="solicitado">Solicitado</option>
                  <option value="entregado">Entregado</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Observación" htmlFor="observation">
              <Input id="observation" name="observation" />
            </FormField>
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
