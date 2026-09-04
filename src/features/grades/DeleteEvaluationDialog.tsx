"use client";

import { useState } from "react";
import { AlertCircle, Archive } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { EvaluationListItem } from "@/services/grade-overview";

/**
 * Eliminar evaluación -- escritura directa respaldada por RLS
 * (`evaluations_delete_scope`: director/utp/superadmin, o el propio
 * docente en sus cursos), igual que crear/editar en EvaluationFormModal.
 * El trigger `trg_guard_evaluation_delete` (migración 0041) es quien
 * realmente protege el historial académico: rechaza el DELETE si la
 * evaluación tiene una o más calificaciones, sin importar la vía de
 * escritura -- por eso, si ya tiene notas, ni siquiera se ofrece el botón
 * de eliminar: se ofrece archivar en su lugar (mismo campo `status` que ya
 * usa EvaluationFormModal, protegido por el mismo trigger para no dejar de
 * archivar por error un cambio de curso/asignatura/ponderación).
 */
export function DeleteEvaluationDialog({
  open,
  onClose,
  onDeleted,
  evaluation,
  courseLabel,
  subjectName,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  evaluation: EvaluationListItem | null;
  courseLabel: string;
  subjectName: string;
}) {
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!evaluation) return null;
  const hasGrades = evaluation.gradedCount > 0;

  async function handleDelete() {
    if (!evaluation) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: dbError } = await supabase.from("evaluations").delete().eq("id", evaluation.id);
    if (dbError) {
      setLoading(false);
      setError(dbError.message || "No pudimos eliminar la evaluación.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "eliminar_evaluacion",
      p_module: "calificaciones",
      p_entity: "evaluations",
      p_entity_id: evaluation.id,
      p_details: { name: evaluation.name },
    });

    setLoading(false);
    showToast("success", "Evaluación eliminada.");
    onDeleted();
  }

  async function handleArchive() {
    if (!evaluation) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: dbError } = await supabase.from("evaluations").update({ status: "archivada" }).eq("id", evaluation.id);
    if (dbError) {
      setLoading(false);
      setError(dbError.message || "No pudimos archivar la evaluación.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "archivar_evaluacion",
      p_module: "calificaciones",
      p_entity: "evaluations",
      p_entity_id: evaluation.id,
      p_details: { name: evaluation.name },
    });

    setLoading(false);
    showToast("success", "Evaluación archivada.");
    onDeleted();
  }

  if (hasGrades) {
    return (
      <Modal open={open} onClose={() => (!loading ? onClose() : undefined)} title="No se puede eliminar">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="h-4.5 w-4.5" />
            </span>
            <div className="text-sm text-slate-600">
              <p>
                Esta evaluación contiene calificaciones registradas y no puede eliminarse directamente.
              </p>
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <strong>{evaluation.name}</strong> · {courseLabel} · {subjectName}
                {evaluation.evalDate && <> · {formatDate(evaluation.evalDate)}</>} · {evaluation.gradedCount} calificación
                {evaluation.gradedCount === 1 ? "" : "es"}
              </p>
              {evaluation.status !== "archivada" && (
                <p className="mt-2">Puedes archivarla para retirarla del uso activo sin perder el historial académico.</p>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              Cerrar
            </Button>
            {evaluation.status !== "archivada" && (
              <Button type="button" size="sm" onClick={handleArchive} disabled={loading}>
                <Archive className="h-4 w-4" /> {loading ? "Archivando…" : "Archivar evaluación"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={() => (!loading ? onClose() : undefined)}
      onConfirm={handleDelete}
      title="Eliminar evaluación"
      description={
        <>
          <p>¿Eliminar esta evaluación?</p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <strong>{evaluation.name}</strong> · {courseLabel} · {subjectName}
            {evaluation.evalDate && <> · {formatDate(evaluation.evalDate)}</>}
          </p>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </>
      }
      confirmLabel="Eliminar evaluación"
      loading={loading}
    />
  );
}
