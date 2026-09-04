"use client";

import { useRouter } from "next/navigation";
import { Eye, FileText, Download, Paperclip, Activity, ShieldAlert } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { formatDate } from "@/lib/utils";
import { formatFolio } from "@/features/seguro-escolar/utils";
import { SEGURO_ESCOLAR_STATUS_LABELS, SEGURO_ESCOLAR_STATUS_TONE, SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS } from "@/features/seguro-escolar/labels";
import type { DeclarationListItem } from "@/services/seguro-escolar";

export function SeguroEscolarTable({ declarations }: { declarations: DeclarationListItem[] }) {
  const router = useRouter();

  function menuItemsFor(d: DeclarationListItem): ActionsMenuItem[] {
    const base = `/plataforma/seguro-escolar/${d.id}`;
    return [
      { label: "Ver expediente", icon: Eye, onSelect: () => router.push(base) },
      { label: "Generar PDF", icon: FileText, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${d.id}/pdf`, "_blank") },
      { label: "Descargar", icon: Download, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${d.id}/pdf?download=1`, "_blank") },
      { label: "Adjuntar documento", icon: Paperclip, onSelect: () => router.push(`${base}?tab=documentos`) },
      { label: "Seguimiento", icon: Activity, onSelect: () => router.push(`${base}?tab=seguimiento`) },
    ];
  }

  if (declarations.length === 0) {
    return <EmptyState icon={ShieldAlert} title="Sin declaraciones registradas" description="Crea la primera Declaración de Accidente Escolar." />;
  }

  return (
    <Card>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2.5">N°</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Estudiante</th>
              <th className="px-4 py-2.5">Curso</th>
              <th className="px-4 py-2.5">Accidente</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Centro asistencial</th>
              <th className="px-4 py-2.5">Responsable</th>
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
                <td className="px-4 py-2.5 text-slate-600">{SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS[d.accident_type]}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={SEGURO_ESCOLAR_STATUS_TONE[d.status]}>{SEGURO_ESCOLAR_STATUS_LABELS[d.status]}</Badge>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{d.assistance_establishment ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{d.createdByName}</td>
                <td className="px-4 py-2.5 text-right">
                  <ActionsMenu items={menuItemsFor(d)} label={`Acciones para declaración ${formatFolio(d.folio_year, d.folio_number)}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
