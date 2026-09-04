"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ClipboardList } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { formatDate } from "@/lib/utils";
import { EvaluationFormModal } from "@/features/grades/EvaluationFormModal";
import { DeleteEvaluationDialog } from "@/features/grades/DeleteEvaluationDialog";
import type { AdminEvaluationListItem } from "@/services/evaluations";

const STATUS_TONE = { planificada: "neutral", aplicada: "brand", cerrada: "success", borrador: "neutral", archivada: "neutral" } as const;

/**
 * Listado administrable de /plataforma/evaluaciones -- reutiliza
 * EvaluationFormModal y DeleteEvaluationDialog tal cual (misma RPC/trigger
 * de protección de 0041), solo agrega el menú ⋮ por fila que faltaba en
 * esta vista. A diferencia de "Gestionar evaluaciones" (acotada a un curso+
 * asignatura), aquí cada fila puede ser de un curso/asignatura distinto, así
 * que courseId/subjectId/periodId se toman de la propia fila.
 */
export function EvaluationsAdminTable({
  evaluations,
  canWrite,
  userId,
}: {
  evaluations: AdminEvaluationListItem[];
  canWrite: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<AdminEvaluationListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvaluationListItem | null>(null);

  function menuItemsFor(ev: AdminEvaluationListItem): ActionsMenuItem[] {
    return [
      { label: "Editar evaluación", icon: Pencil, onSelect: () => setEditTarget(ev) },
      { label: "Eliminar evaluación", icon: Trash2, danger: true, onSelect: () => setDeleteTarget(ev) },
    ];
  }

  return (
    <Card>
      <CardBody>
        {evaluations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Evaluación</th>
                  <th className="py-2 pr-4">Curso</th>
                  <th className="py-2 pr-4">Asignatura</th>
                  <th className="py-2 pr-4">Período</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Estado</th>
                  {canWrite && <th className="py-2 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluations.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{ev.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{ev.courseLabel}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{ev.subjectName}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{ev.periodName ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{formatDate(ev.evalDate)}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={STATUS_TONE[ev.status]}>{ev.status}</Badge>
                    </td>
                    {canWrite && (
                      <td className="py-2.5 text-right">
                        {/* Fuera de cualquier Link -- esta tabla no envuelve filas en un enlace navegable, así que el menú siempre queda accesible, en escritorio y en móvil. */}
                        <ActionsMenu items={menuItemsFor(ev)} label={`Acciones para ${ev.name}`} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="Sin evaluaciones registradas" description="Crea la primera evaluación para comenzar a ingresar calificaciones." />
        )}
      </CardBody>

      {editTarget && (
        <EvaluationFormModal
          open
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            router.refresh();
          }}
          courseId={editTarget.courseId}
          subjectId={editTarget.subjectId}
          periodId={editTarget.periodId}
          userId={userId}
          evaluation={editTarget}
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
        courseLabel={deleteTarget?.courseLabel ?? ""}
        subjectName={deleteTarget?.subjectName ?? ""}
      />
    </Card>
  );
}
