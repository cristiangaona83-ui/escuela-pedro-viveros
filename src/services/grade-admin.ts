"use client";

import { createClient } from "@/lib/supabase/client";
import type { GradeChangeReason } from "@/types/database";

export type { GradeChangeReason };

export const GRADE_CHANGE_REASON_LABEL: Record<GradeChangeReason, string> = {
  error_digitacion: "Error de digitación",
  correccion_docente: "Corrección docente",
  evaluacion_recuperativa: "Evaluación recuperativa",
  autorizacion_utp: "Autorización UTP",
  otro: "Otro",
};

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Wrappers de las RPC administrativas de notas (ver migración 0039) --
 * siempre exigen motivo, y el registro en `grade_change_history` queda a
 * cargo del trigger de base de datos, no de este código.
 */
export async function setGradeAdministrative(params: {
  evaluationId: string;
  studentId: string;
  score: number;
  reason: GradeChangeReason;
  reasonNote?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_grade_administrative", {
    p_evaluation_id: params.evaluationId,
    p_student_id: params.studentId,
    p_score: params.score,
    p_reason: params.reason,
    p_reason_note: params.reasonNote,
  });
  if (error) return { ok: false, error: error.message || "No se pudo guardar la nota." };
  return { ok: true };
}

export async function deleteGradeAdministrative(params: {
  evaluationId: string;
  studentId: string;
  reason: GradeChangeReason;
  reasonNote?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_grade_administrative", {
    p_evaluation_id: params.evaluationId,
    p_student_id: params.studentId,
    p_reason: params.reason,
    p_reason_note: params.reasonNote,
  });
  if (error) return { ok: false, error: error.message || "No se pudo eliminar la nota." };
  return { ok: true };
}
