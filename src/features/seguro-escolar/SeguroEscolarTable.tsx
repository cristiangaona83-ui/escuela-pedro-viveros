"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Download, Printer, Trash2, ShieldAlert } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { formatFolio } from "@/features/seguro-escolar/utils";
import { SEGURO_ESCOLAR_STATUS_LABELS, SEGURO_ESCOLAR_STATUS_TONE } from "@/features/seguro-escolar/labels";
import { DeleteDeclarationDialog } from "@/features/seguro-escolar/DeleteDeclarationDialog";
import type { DeclarationListItem } from "@/services/seguro-escolar";

export function SeguroEscolarTable({ declarations }: { declarations: DeclarationListItem[] }) {
  const router = useRouter();
  const showToast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<DeclarationListItem | null>(null);

  function menuItemsFor(d: DeclarationListItem): ActionsMenuItem[] {
    const base = `/plataforma/seguro-escolar/${d.id}`;
    return [
      { label: "Ver", icon: Eye, onSelect: () => router.push(base) },
      { label: "Editar", icon: Pencil, onSelect: () => router.push(`${base}?edit=1`), disabled: d.status === "anulado" },
      { label: "Descargar PDF", icon: Download, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${d.id}/pdf?download=1`, "_blank") },
      { label: "Imprimir", icon: Printer, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${d.id}/pdf`, "_blank") },
      { label: "Eliminar", icon: Trash2, danger: true, onSelect: () => setDeleteTarget(d) },
    ];
  }

  if (declarations.length === 0) {
    return <EmptyState icon={ShieldAlert} title="Sin declaraciones registradas" description="Crea la primera Declaración de Accidente Escolar." />;
  }

  return (
    <Card>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2.5">N°</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Estudiante</th>
              <th className="px-4 py-2.5">Curso</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {declarations.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{formatFolio(d.folio_year, d.folio_number)}</td>
                <td className="px-4 py-2.5 text-slate-600">{formatDate(d.accident_date)}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{d.studentName}</td>
                <td className="px-4 py-2.5 text-slate-600">{d.course_label}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={SEGURO_ESCOLAR_STATUS_TONE[d.status]}>{SEGURO_ESCOLAR_STATUS_LABELS[d.status]}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ActionsMenu items={menuItemsFor(d)} label={`Acciones para declaración ${formatFolio(d.folio_year, d.folio_number)}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>

      {deleteTarget && (
        <DeleteDeclarationDialog
          open
          onClose={() => setDeleteTarget(null)}
          declaration={{
            id: deleteTarget.id,
            folio: formatFolio(deleteTarget.folio_year, deleteTarget.folio_number),
            studentName: deleteTarget.studentName,
            courseLabel: deleteTarget.course_label,
            accidentDate: deleteTarget.accident_date,
            status: deleteTarget.status,
          }}
          onDeleted={() => {
            setDeleteTarget(null);
            showToast("success", "Seguro Escolar eliminado.");
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
