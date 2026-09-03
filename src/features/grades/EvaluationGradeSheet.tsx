"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Undo2, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { GradeReasonSelect } from "./GradeReasonSelect";
import { setGradeAdministrative, deleteGradeAdministrative, type GradeChangeReason } from "@/services/grade-admin";
import { isGradeInRange, roundGrade, type GradingConfig } from "@/config/grading";
import { formatGrade } from "@/lib/utils";
import type { EvaluationGradeSheet as EvaluationGradeSheetData } from "@/services/grade-overview";

type RowState = {
  studentId: string;
  studentName: string;
  studentRun: string;
  originalScore: number | null;
  draft: string;
};

function scoreLabel(score: number | null): string {
  return score === null ? "—" : formatGrade(score);
}

export function EvaluationGradeSheet({ sheet, gradingConfig }: { sheet: EvaluationGradeSheetData; gradingConfig: GradingConfig }) {
  const showToast = useToast();
  const [rows, setRows] = useState<RowState[]>(() =>
    sheet.rows.map((r) => ({ studentId: r.studentId, studentName: r.studentName, studentRun: r.studentRun, originalScore: r.score, draft: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reason, setReason] = useState<GradeChangeReason | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RowState | null>(null);
  const [deleteReason, setDeleteReason] = useState<GradeChangeReason | "">("");
  const [deleteNote, setDeleteNote] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const dirtyRows = useMemo(
    () => rows.filter((r) => r.draft.trim() !== "" && Number(r.draft.replace(",", ".")) !== r.originalScore),
    [rows]
  );

  useEffect(() => {
    if (dirtyRows.length === 0) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyRows.length]);

  function updateDraft(studentId: string, value: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, draft: value } : r)));
    setRowError((prev) => {
      if (!(studentId in prev)) return prev;
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  }

  function undoAll() {
    setRows((prev) => prev.map((r) => ({ ...r, draft: "" })));
    setRowError({});
  }

  function validateDirtyRows(): boolean {
    const errors: Record<string, string> = {};
    for (const row of dirtyRows) {
      const numeric = Number(row.draft.replace(",", "."));
      if (Number.isNaN(numeric) || !isGradeInRange(numeric, gradingConfig)) {
        errors[row.studentId] = `Debe estar entre ${gradingConfig.scaleMin} y ${gradingConfig.scaleMax}.`;
      }
    }
    setRowError(errors);
    return Object.keys(errors).length === 0;
  }

  function openSaveDialog() {
    if (dirtyRows.length === 0) return;
    if (!validateDirtyRows()) return;
    setReasonModalOpen(true);
  }

  async function handleSaveAll() {
    if (reason === "" || (reason === "otro" && reasonNote.trim() === "")) return;
    setSaving(true);
    const results = await Promise.allSettled(
      dirtyRows.map((row) =>
        setGradeAdministrative({
          evaluationId: sheet.evaluationId,
          studentId: row.studentId,
          score: roundGrade(Number(row.draft.replace(",", ".")), gradingConfig),
          reason: reason as GradeChangeReason,
          reasonNote: reasonNote.trim() || undefined,
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
    setSaving(false);
    setReasonModalOpen(false);
    setReason("");
    setReasonNote("");

    if (failed > 0) {
      showToast("error", `${dirtyRows.length - failed} de ${dirtyRows.length} notas guardadas. ${failed} fallaron — vuelve a intentar.`);
    } else {
      showToast("success", `${dirtyRows.length} nota${dirtyRows.length === 1 ? "" : "s"} guardada${dirtyRows.length === 1 ? "" : "s"}.`);
    }

    setRows((prev) =>
      prev.map((r) => {
        const wasDirty = dirtyRows.some((d) => d.studentId === r.studentId);
        if (!wasDirty) return r;
        return { ...r, originalScore: roundGrade(Number(r.draft.replace(",", ".")), gradingConfig), draft: "" };
      })
    );
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleteReason === "" || (deleteReason === "otro" && deleteNote.trim() === "")) return;
    setDeleting(true);
    const result = await deleteGradeAdministrative({
      evaluationId: sheet.evaluationId,
      studentId: deleteTarget.studentId,
      reason: deleteReason as GradeChangeReason,
      reasonNote: deleteNote.trim() || undefined,
    });
    setDeleting(false);
    if (!result.ok) {
      showToast("error", result.error);
      return;
    }
    showToast("success", `Nota de ${deleteTarget.studentName} eliminada.`);
    setRows((prev) => prev.map((r) => (r.studentId === deleteTarget.studentId ? { ...r, originalScore: null, draft: "" } : r)));
    setDeleteTarget(null);
    setDeleteReason("");
    setDeleteNote("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {dirtyRows.length > 0
            ? `${dirtyRows.length} cambio${dirtyRows.length === 1 ? "" : "s"} sin guardar`
            : "Sin cambios pendientes"}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={undoAll} disabled={dirtyRows.length === 0 || saving}>
            <Undo2 className="h-4 w-4" /> Deshacer cambios
          </Button>
          <Button type="button" size="sm" onClick={openSaveDialog} disabled={dirtyRows.length === 0 || saving}>
            <Save className="h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </div>

      <Card className="mt-4">
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Estudiante</th>
                  <th className="py-2 pr-3">RUN</th>
                  <th className="py-2 pr-3">Nota actual</th>
                  <th className="py-2 pr-3">Nueva nota</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isDirty = row.draft.trim() !== "" && Number(row.draft.replace(",", ".")) !== row.originalScore;
                  const error = rowError[row.studentId];
                  return (
                    <tr key={row.studentId} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-medium text-slate-800">{row.studentName}</td>
                      <td className="py-2 pr-3 text-slate-500">{row.studentRun}</td>
                      <td className="py-2 pr-3 text-slate-700">{scoreLabel(row.originalScore)}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.draft}
                          onChange={(e) => updateDraft(row.studentId, e.target.value)}
                          placeholder={row.originalScore === null ? "Sin nota" : ""}
                          className={`w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                            error ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/15"
                          }`}
                        />
                        {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
                      </td>
                      <td className="py-2 pr-3">
                        {isDirty ? (
                          <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Por guardar</span>
                        ) : row.originalScore === null ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Sin nota</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Registrada</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          disabled={row.originalScore === null}
                          aria-label={`Eliminar nota de ${row.studentName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Guardar cambios (lote) -- un solo motivo para todos los cambios de esta sesión de edición. */}
      <Modal open={reasonModalOpen} onClose={() => (!saving ? setReasonModalOpen(false) : undefined)} title="Motivo de la modificación">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Vas a guardar {dirtyRows.length} nota{dirtyRows.length === 1 ? "" : "s"}. Indica el motivo de esta corrección.
          </p>
          <GradeReasonSelect reason={reason} onReasonChange={setReason} note={reasonNote} onNoteChange={setReasonNote} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setReasonModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              disabled={saving || reason === "" || (reason === "otro" && reasonNote.trim() === "")}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Guardando…" : "Confirmar y guardar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Eliminar una nota individual */}
      <Modal open={deleteTarget !== null} onClose={() => (!deleting ? setDeleteTarget(null) : undefined)} title="Eliminar nota">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="h-4.5 w-4.5" />
              </span>
              <p className="text-sm text-slate-600">
                ¿Eliminar la nota de <strong>{deleteTarget.studentName}</strong> ({scoreLabel(deleteTarget.originalScore)}) en esta evaluación?
              </p>
            </div>
            <GradeReasonSelect reason={deleteReason} onReasonChange={setDeleteReason} note={deleteNote} onNoteChange={setDeleteNote} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleting || deleteReason === "" || (deleteReason === "otro" && deleteNote.trim() === "")}
                className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
              >
                {deleting ? "Eliminando…" : "Eliminar nota"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
