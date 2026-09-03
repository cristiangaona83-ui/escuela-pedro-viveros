"use client";

import { Select, Textarea } from "@/components/ui/Field";
import { GRADE_CHANGE_REASON_LABEL, type GradeChangeReason } from "@/services/grade-admin";

const REASON_OPTIONS = Object.keys(GRADE_CHANGE_REASON_LABEL) as GradeChangeReason[];

/** Selector de "motivo de modificación" -- se repite en toda la administración de notas (editar, eliminar, planilla, eliminar evaluación). Si es "otro", exige observación. */
export function GradeReasonSelect({
  reason,
  onReasonChange,
  note,
  onNoteChange,
}: {
  reason: GradeChangeReason | "";
  onReasonChange: (reason: GradeChangeReason | "") => void;
  note: string;
  onNoteChange: (note: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Motivo de modificación</label>
        <Select value={reason} onChange={(e) => onReasonChange(e.target.value as GradeChangeReason | "")} required>
          <option value="" disabled>
            Selecciona un motivo…
          </option>
          {REASON_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {GRADE_CHANGE_REASON_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>
      {reason === "otro" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Observación</label>
          <Textarea value={note} onChange={(e) => onNoteChange(e.target.value)} rows={2} required placeholder="Describe brevemente el motivo…" />
        </div>
      )}
    </div>
  );
}
