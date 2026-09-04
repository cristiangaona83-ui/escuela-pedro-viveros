"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive, Trash2, AlertCircle } from "lucide-react";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { SituationListItem } from "@/services/convivencia";

/**
 * ⋮ Editar / Archivar / Eliminar de una situación -- se usa tanto en el
 * listado (Situaciones) como en la ficha de detalle, mismo componente para
 * no duplicar lógica. "Eliminar" hace un DELETE directo respaldado por RLS
 * (`convivencia_situations_delete`: director/superadmin/convivencia); el
 * trigger `trg_guard_situation_delete` (migración 0042) es quien realmente
 * protege los antecedentes -- si la situación ya es un caso o tiene
 * documentos adjuntos, rechaza el DELETE sin importar la vía, y aquí se
 * muestra el mismo mensaje ofreciendo archivar en su lugar.
 */
export function SituationActionsMenu({
  situation,
  canManage,
  redirectAfterDeleteTo,
}: {
  situation: SituationListItem;
  canManage: boolean;
  /** Si se pasa (ficha de detalle), navega ahí tras eliminar en vez de refrescar la misma ruta (que ya no existiría). */
  redirectAfterDeleteTo?: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  const courseLabels = Array.from(new Set(situation.students.map((s) => s.courseLabel ?? "—"))).join(", ") || "—";
  const studentNames = situation.students.map((s) => `${s.student.last_names}, ${s.student.first_names}`).join(" · ") || "Sin estudiantes";
  const hasBlockingAntecedents = situation.case_id !== null;

  async function handleArchive() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("convivencia_situations").update({ status: "archivado" }).eq("id", situation.id);
    if (dbError) {
      setLoading(false);
      setError(dbError.message || "No pudimos archivar la situación.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "archivar_situacion",
      p_module: "convivencia",
      p_entity: "convivencia_situations",
      p_entity_id: situation.id,
    });
    setLoading(false);
    setArchiveOpen(false);
    showToast("success", "Situación archivada.");
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("convivencia_situations").delete().eq("id", situation.id);
    if (dbError) {
      setLoading(false);
      setDeleteOpen(false);
      setBlockedOpen(true);
      setError(dbError.message);
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "eliminar_situacion",
      p_module: "convivencia",
      p_entity: "convivencia_situations",
      p_entity_id: situation.id,
    });
    setLoading(false);
    setDeleteOpen(false);
    showToast("success", "Situación eliminada correctamente.");
    if (redirectAfterDeleteTo) router.push(redirectAfterDeleteTo);
    else router.refresh();
  }

  function handleDeletePress() {
    if (hasBlockingAntecedents) {
      setBlockedOpen(true);
      return;
    }
    setDeleteOpen(true);
  }

  const items: ActionsMenuItem[] = [
    { label: "Editar situación", icon: Pencil, onSelect: () => router.push(`/plataforma/convivencia/situaciones/${situation.id}/editar`), disabled: situation.status === "archivado" },
    { label: "Archivar situación", icon: Archive, onSelect: () => setArchiveOpen(true), disabled: situation.status === "archivado" },
    { label: "Eliminar situación", icon: Trash2, danger: true, onSelect: handleDeletePress },
  ];

  return (
    <>
      <ActionsMenu items={items} label={`Acciones de la situación del ${formatDate(situation.occurred_on)}`} />

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => (!loading ? setArchiveOpen(false) : undefined)}
        onConfirm={handleArchive}
        title="Archivar situación"
        description="¿Archivar esta situación? Dejará de aparecer en los listados activos, pero se conserva íntegramente."
        confirmLabel="Archivar"
        loading={loading}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!loading ? setDeleteOpen(false) : undefined)}
        onConfirm={handleDelete}
        title="Eliminar situación"
        description={
          <>
            <p>¿Eliminar esta situación?</p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {formatDate(situation.occurred_on)} · {courseLabels} · {studentNames} · {situation.case_type_label}
              {situation.description && <><br />{situation.description.slice(0, 140)}{situation.description.length > 140 ? "…" : ""}</>}
            </p>
          </>
        }
        confirmLabel="Eliminar situación"
        loading={loading}
      />

      <Modal open={blockedOpen} onClose={() => setBlockedOpen(false)} title="No se puede eliminar">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="h-4.5 w-4.5" />
            </span>
            <div className="text-sm text-slate-600">
              <p>Esta situación tiene antecedentes asociados y no puede eliminarse directamente.</p>
              {error && <p className="mt-2 text-xs text-slate-500">{error}</p>}
              {situation.status !== "archivado" && <p className="mt-2">Puedes archivarla para retirarla del uso activo sin perder el historial.</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setBlockedOpen(false)}>
              Cerrar
            </Button>
            {situation.status !== "archivado" && (
              <Button type="button" size="sm" onClick={() => { setBlockedOpen(false); setArchiveOpen(true); }}>
                <Archive className="h-4 w-4" /> Archivar situación
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
