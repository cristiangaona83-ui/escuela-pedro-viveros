"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ClipboardEdit, History, Trash2, Plus, CheckCircle2, Clock, FileQuestion } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { formatDate, formatGrade } from "@/lib/utils";
import { EvaluationFormModal } from "./EvaluationFormModal";
import { DeleteEvaluationDialog } from "./DeleteEvaluationDialog";
import type { CourseSubjectEvaluations, EvaluationListItem } from "@/services/grade-overview";
import type { EvaluationRow } from "@/types/database";

const STATUS_LABEL: Record<EvaluationRow["status"], string> = {
  borrador: "Borrador",
  planificada: "Planificada",
  aplicada: "Aplicada",
  cerrada: "Cerrada",
  archivada: "Archivada",
};
const STATUS_TONE: Record<EvaluationRow["status"], "neutral" | "brand" | "success" | "warning"> = {
  borrador: "neutral",
  planificada: "brand",
  aplicada: "success",
  cerrada: "warning",
  archivada: "neutral",
};

export function EvaluationsListClient({
  data,
  year,
  periodId,
  userId,
}: {
  data: CourseSubjectEvaluations;
  year: string;
  periodId: string;
  userId: string;
}) {
  const router = useRouter();
  const [formTarget, setFormTarget] = useState<{ mode: "create" } | { mode: "edit"; evaluation: EvaluationListItem } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvaluationListItem | null>(null);

  const extraParams = `year=${year}&period=${periodId}`;

  function menuItemsFor(evaluation: EvaluationListItem): ActionsMenuItem[] {
    return [
      { label: "Editar evaluación", icon: Pencil, onSelect: () => setFormTarget({ mode: "edit", evaluation }) },
      {
        label: "Administrar calificaciones",
        icon: ClipboardEdit,
        onSelect: () => router.push(`/plataforma/calificaciones/${data.courseId}/${data.subjectId}/evaluaciones/${evaluation.id}?${extraParams}`),
      },
      {
        label: "Ver historial",
        icon: History,
        onSelect: () => router.push(`/plataforma/calificaciones/historial?evaluation=${evaluation.id}`),
      },
      { label: "Eliminar evaluación", icon: Trash2, danger: true, onSelect: () => setDeleteTarget(evaluation) },
    ];
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <Button type="button" size="sm" onClick={() => setFormTarget({ mode: "create" })}>
          <Plus className="h-4 w-4" /> Nueva evaluación
        </Button>
      </div>

      <Card className="mt-4">
        <CardBody>
          {data.evaluations.length === 0 ? (
            <EmptyState icon={FileQuestion} title="Sin evaluaciones" description="Crea la primera evaluación de esta asignatura para el período seleccionado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Evaluación</th>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Ponderación</th>
                    <th className="py-2 pr-3">Notas</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evaluations.map((ev) => (
                    <tr key={ev.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-800">{ev.name}</p>
                        {ev.description && <p className="text-xs text-slate-400">{ev.description}</p>}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{ev.evalDate ? formatDate(ev.evalDate) : "—"}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{formatGrade(ev.weight)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex items-center gap-1 ${ev.gradedCount === ev.studentCount && ev.studentCount > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                          {ev.gradedCount === ev.studentCount && ev.studentCount > 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {ev.gradedCount}/{ev.studentCount}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={STATUS_TONE[ev.status]}>{STATUS_LABEL[ev.status]}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <ActionsMenu items={menuItemsFor(ev)} label={`Acciones para ${ev.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {formTarget && (
        <EvaluationFormModal
          open
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            router.refresh();
          }}
          courseId={data.courseId}
          subjectId={data.subjectId}
          periodId={periodId}
          userId={userId}
          evaluation={formTarget.mode === "edit" ? formTarget.evaluation : undefined}
        />
      )}

      <DeleteEvaluationDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
        evaluation={deleteTarget}
      />
    </div>
  );
}
