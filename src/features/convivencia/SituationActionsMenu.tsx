"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive, Trash2, AlertCircle } from "lucide-react";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { PRIVATE_BUCKET } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils";
import type { SituationListItem } from "@/services/convivencia";

/**
 * ⋮ Editar / Archivar / Eliminar de una situación -- se usa tanto en el
 * listado (Situaciones) como en la ficha de detalle, mismo componente para
 * no duplicar lógica. "Eliminar" hace un DELETE directo respaldado por RLS
 * (`convivencia_situations_delete`: director/superadmin/convivencia); el
 * trigger `trg_guard_situation_delete` (migración 0042) es quien realmente
 * protege los antecedentes -- si la situación ya es un caso o tiene
 * documentos adjuntos, rechaza el DELETE sin importar la vía.
 *
 * Dos protecciones se comportan distinto:
 * - Ya es un caso (case_id no nulo): bloqueo absoluto, sin excepción para
 *   nadie (ni director/superadmin/convivencia) -- borrar la situación
 *   rompería el origen histórico de un caso real. Se ofrece "Ver caso"
 *   (desde ahí se archiva/envía a papelera/elimina definitivamente con el
 *   flujo ya existente de Etapa 2).
 * - Tiene documentos adjuntos, pero SIN caso: director/superadmin/
 *   convivencia -- los mismos tres roles que ya pueden editar/archivar --
 *   pueden forzar una eliminación definitiva (RPC administrativa de 0043,
 *   ampliada a convivencia en 0044) con confirmación reforzada tipada.
 */
export function SituationActionsMenu({
  situation,
  canManage,
  redirectAfterDeleteTo,
}: {
  situation: SituationListItem;
  /** director/superadmin/convivencia -- mismas facultades operativas para editar/archivar/eliminar (incluida la excepción administrativa con documentos). */
  canManage: boolean;
  /** Si se pasa (ficha de detalle), navega ahí tras eliminar en vez de refrescar la misma ruta (que ya no existiría). */
  redirectAfterDeleteTo?: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [caseBlockedOpen, setCaseBlockedOpen] = useState(false);
  const [adminDeleteOpen, setAdminDeleteOpen] = useState(false);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  const courseLabels = Array.from(new Set(situation.students.map((s) => s.courseLabel ?? "—"))).join(", ") || "—";
  const studentNames = situation.students.map((s) => `${s.student.last_names}, ${s.student.first_names}`).join(" · ") || "Sin estudiantes";
  const hasCase = situation.case_id !== null;

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
      // El único motivo por el que el DELETE simple puede fallar aquí es
      // que tenga documentos adjuntos (case_id ya se descartó antes de
      // llegar a este punto -- ver handleDeletePress) -- se ofrece la
      // excepción administrativa, disponible para los tres roles que ya
      // pueden editar/archivar esta situación.
      const { count } = await supabase
        .from("convivencia_attachments")
        .select("id", { count: "exact", head: true })
        .eq("situation_id", situation.id);
      setDocumentCount(count ?? 0);
      setAdminDeleteOpen(true);
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

  async function handleAdminDelete() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: paths, error: rpcError } = await supabase.rpc("permanently_delete_situation_administrative", {
      p_situation_id: situation.id,
    });
    if (rpcError) {
      setLoading(false);
      setError(rpcError.message || "No pudimos eliminar la situación.");
      return;
    }

    if (paths && paths.length > 0) {
      const { error: storageError } = await supabase.storage.from(PRIVATE_BUCKET).remove(paths);
      if (storageError) {
        // La fila ya se eliminó de la base de datos (éxito confirmado arriba)
        // -- no se revierte nada. Queda registrado para limpieza manual del
        // bucket; el registro en base de datos, que es lo que importa para
        // trazabilidad, ya está correcto y no hay referencias rotas.
        console.error("[SituationActionsMenu] No se pudieron borrar algunos archivos de Storage tras eliminar la situación:", {
          situationId: situation.id,
          paths,
          error: storageError.message,
        });
      }
    }

    setLoading(false);
    setAdminDeleteOpen(false);
    setTypedValue("");
    showToast("success", "Situación eliminada definitivamente.");
    if (redirectAfterDeleteTo) router.push(redirectAfterDeleteTo);
    else router.refresh();
  }

  function handleDeletePress() {
    if (hasCase) {
      setCaseBlockedOpen(true);
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

      {/* Ya es un caso -- bloqueo absoluto, sin excepción para nadie. */}
      <Modal open={caseBlockedOpen} onClose={() => setCaseBlockedOpen(false)} title="No se puede eliminar">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="h-4.5 w-4.5" />
            </span>
            <p className="text-sm text-slate-600">
              Esta situación ya dio origen a un caso de Convivencia. Para resguardar la trazabilidad, gestione primero el caso correspondiente.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCaseBlockedOpen(false)}>
              Cerrar
            </Button>
            {situation.case_id && (
              <LinkButton href={`/plataforma/convivencia/casos/${situation.case_id}`} size="sm">
                Ver caso
              </LinkButton>
            )}
          </div>
        </div>
      </Modal>

      {/* Excepción administrativa: director/superadmin/convivencia, sin caso asociado, con documentos. */}
      <Modal
        open={adminDeleteOpen}
        onClose={() => {
          if (loading) return;
          setAdminDeleteOpen(false);
          setTypedValue("");
        }}
        title="Eliminar definitivamente esta situación"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-4.5 w-4.5" />
            </span>
            <div className="text-sm text-slate-600">
              <p>
                Esta acción eliminará la situación y los documentos adjuntos asociados. <strong>No se puede deshacer.</strong>
              </p>
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {formatDate(situation.occurred_on)} · {situation.case_type_label} · {courseLabels}
                <br />
                {situation.description?.slice(0, 140)}{(situation.description?.length ?? 0) > 140 ? "…" : ""}
                <br />
                {documentCount ?? 0} documento{documentCount === 1 ? "" : "s"} adjunto{documentCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Escribe <span className="font-semibold text-slate-700">ELIMINAR</span> para confirmar
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setAdminDeleteOpen(false); setTypedValue(""); }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdminDelete}
              disabled={loading || typedValue.trim().toUpperCase() !== "ELIMINAR"}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
            >
              {loading ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
