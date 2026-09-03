"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { GradeReasonSelect } from "./GradeReasonSelect";
import { deleteEvaluationAdministrative, type GradeChangeReason } from "@/services/grade-admin";
import type { EvaluationListItem } from "@/services/grade-overview";

/**
 * Eliminar evaluación -- advierte cuántas calificaciones se perderán,
 * exige motivo y (por ser destructiva sobre datos académicos) escribir
 * "ELIMINAR" antes de habilitar el botón. El historial de cada nota
 * eliminada queda protegido por el trigger de base de datos (migración
 * 0039), no depende de este componente.
 */
export function DeleteEvaluationDialog({
  open,
  onClose,
  onDeleted,
  evaluation,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  evaluation: EvaluationListItem | null;
}) {
  const showToast = useToast();
  const [reason, setReason] = useState<GradeChangeReason | "">("");
  const [note, setNote] = useState("");
  const [typedValue, setTypedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!evaluation) return null;

  const canConfirm = reason !== "" && (reason !== "otro" || note.trim() !== "") && typedValue.trim().toUpperCase() === "ELIMINAR";

  function reset() {
    setReason("");
    setNote("");
    setTypedValue("");
    setError(null);
  }

  async function handleConfirm() {
    if (!canConfirm || !evaluation) return;
    setLoading(true);
    setError(null);
    const result = await deleteEvaluationAdministrative({
      evaluationId: evaluation.id,
      reason: reason as GradeChangeReason,
      reasonNote: note.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast("success", `Evaluación "${evaluation.name}" eliminada.`);
    reset();
    onDeleted();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (loading) return;
        reset();
        onClose();
      }}
      title="Eliminar evaluación"
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          Está a punto de eliminar la evaluación <strong>&ldquo;{evaluation.name}&rdquo;</strong>.
          {evaluation.gradedCount > 0 ? (
            <>
              {" "}Esta evaluación contiene <strong>{evaluation.gradedCount}</strong> calificacion{evaluation.gradedCount === 1 ? "" : "es"}.
              Si continúa, las calificaciones asociadas también serán eliminadas.
            </>
          ) : (
            " No tiene calificaciones registradas todavía."
          )}
          {" "}Esta acción afectará información académica y no se puede deshacer.
        </div>

        <GradeReasonSelect reason={reason} onReasonChange={setReason} note={note} onNoteChange={setNote} />

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Escribe <span className="font-semibold text-slate-700">ELIMINAR</span> para confirmar
          </label>
          <input
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => { reset(); onClose(); }} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
          >
            {loading ? "Eliminando…" : "Eliminar evaluación"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
