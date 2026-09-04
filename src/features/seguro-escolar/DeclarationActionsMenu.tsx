"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Download, Printer, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { EditDeclarationModal } from "@/features/seguro-escolar/EditDeclarationModal";
import { DeleteDeclarationDialog } from "@/features/seguro-escolar/DeleteDeclarationDialog";
import { formatFolio } from "@/features/seguro-escolar/utils";
import type { DeclarationDetail } from "@/services/seguro-escolar";

/**
 * Editar / Descargar PDF / Imprimir quedan siempre visibles arriba (punto
 * 11 del pedido: "no esconder Descargar PDF dentro de varias pantallas").
 * "Más acciones" (⋮) agrupa lo excepcional: Anular (soft, conserva la fila
 * -- para declaraciones legítimas que dejaron de ser válidas) y Eliminar
 * (RPC administrativa 0047, borrado real con limpieza de Storage -- para
 * registros creados por error o duplicados).
 */
export function DeclarationActionsMenu({
  declaration,
  canManage,
  autoOpenEdit = false,
}: {
  declaration: DeclarationDetail;
  canManage: boolean;
  /** Abre el modal de edición de inmediato -- usado cuando se llega desde "Editar" en el listado (?edit=1). */
  autoOpenEdit?: boolean;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [editOpen, setEditOpen] = useState(autoOpenEdit && canManage && declaration.status !== "anulado");
  const [annulOpen, setAnnulOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnnul() {
    if (!reason.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      showToast("error", "Sesión no válida.");
      return;
    }
    const { error } = await supabase
      .from("seguro_escolar_declarations")
      .update({ status: "anulado", annulled_reason: reason.trim(), annulled_by: user.id, annulled_at: new Date().toISOString() })
      .eq("id", declaration.id);
    if (error) {
      setLoading(false);
      showToast("error", error.message || "No pudimos anular la declaración.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "anular_declaracion_seguro_escolar",
      p_module: "seguro_escolar",
      p_entity: "seguro_escolar_declarations",
      p_entity_id: declaration.id,
      p_details: { reason: reason.trim() },
    });
    setLoading(false);
    setAnnulOpen(false);
    showToast("success", "Declaración anulada.");
    router.refresh();
  }

  const moreItems: ActionsMenuItem[] = [];
  if (canManage && declaration.status !== "anulado") {
    moreItems.push({ label: "Anular declaración", icon: Ban, onSelect: () => setAnnulOpen(true) });
  }
  if (canManage) {
    moreItems.push({ label: "Eliminar Seguro Escolar", icon: Trash2, danger: true, onSelect: () => setDeleteOpen(true) });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canManage && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(true)} disabled={declaration.status === "anulado"}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => window.open(`/plataforma/api/seguro-escolar/${declaration.id}/pdf?download=1`, "_blank")}
        >
          <Download className="h-4 w-4" /> Descargar PDF
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => window.open(`/plataforma/api/seguro-escolar/${declaration.id}/pdf`, "_blank")}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        {moreItems.length > 0 && <ActionsMenu items={moreItems} label="Más acciones" />}
      </div>

      {editOpen && <EditDeclarationModal open={editOpen} onClose={() => setEditOpen(false)} declaration={declaration} />}

      <ConfirmDialog
        open={annulOpen}
        onClose={() => (!loading ? setAnnulOpen(false) : undefined)}
        onConfirm={handleAnnul}
        title="Anular declaración"
        description={
          <>
            <p>¿Anular esta declaración? Se conserva íntegramente (no se elimina), solo queda marcada como anulada.</p>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Motivo de anulación</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} required />
            </div>
          </>
        }
        confirmLabel="Anular"
        loading={loading}
      />

      <DeleteDeclarationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        declaration={{
          id: declaration.id,
          folio: formatFolio(declaration.folio_year, declaration.folio_number),
          studentName: declaration.studentName,
          courseLabel: declaration.course_label,
          accidentDate: declaration.accident_date,
          status: declaration.status,
        }}
        onDeleted={() => {
          setDeleteOpen(false);
          showToast("success", "Seguro Escolar eliminado.");
          router.push("/plataforma/seguro-escolar");
        }}
      />
    </>
  );
}
