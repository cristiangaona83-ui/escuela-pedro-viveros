"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, FileText, Download, Printer, Ban } from "lucide-react";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { EditDeclarationModal } from "@/features/seguro-escolar/EditDeclarationModal";
import type { DeclarationDetail } from "@/services/seguro-escolar";

/**
 * ⋮ Editar / Generar PDF / Imprimir / Descargar / Anular. "Anular" nunca
 * borra la fila (punto 31 del pedido: no eliminación normal) -- solo marca
 * status='anulado' con motivo/usuario/fecha, RLS-respaldado, auditado.
 */
export function DeclarationActionsMenu({ declaration, canManage }: { declaration: DeclarationDetail; canManage: boolean }) {
  const router = useRouter();
  const showToast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [annulOpen, setAnnulOpen] = useState(false);
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

  const items: ActionsMenuItem[] = [];
  if (canManage) items.push({ label: "Editar declaración", icon: Pencil, onSelect: () => setEditOpen(true), disabled: declaration.status === "anulado" });
  items.push({ label: "Generar PDF", icon: FileText, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${declaration.id}/pdf`, "_blank") });
  items.push({ label: "Imprimir", icon: Printer, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${declaration.id}/pdf?print=1`, "_blank") });
  items.push({ label: "Descargar PDF", icon: Download, onSelect: () => window.open(`/plataforma/api/seguro-escolar/${declaration.id}/pdf?download=1`, "_blank") });
  if (canManage && declaration.status !== "anulado") {
    items.push({ label: "Anular declaración", icon: Ban, danger: true, onSelect: () => setAnnulOpen(true) });
  }

  return (
    <>
      <ActionsMenu items={items} label="Acciones de la declaración" />

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
    </>
  );
}
