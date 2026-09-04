"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { PRIVATE_BUCKET } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils";
import { SEGURO_ESCOLAR_STATUS_LABELS } from "@/features/seguro-escolar/labels";
import type { SeguroEscolarStatus } from "@/types/database";

export interface DeleteDeclarationSummary {
  id: string;
  folio: string;
  studentName: string;
  courseLabel: string;
  accidentDate: string;
  status: SeguroEscolarStatus;
}

/**
 * Elimina definitivamente una declaración -- RPC administrativa
 * `permanently_delete_seguro_escolar_declaration` (0047, director/
 * superadmin/inspectoria_general): borra primero en BD (cascada a
 * documentos/contactos/seguimientos, ya definida en 0046) y devuelve las
 * storage_path de los adjuntos, que recién entonces se borran de Storage --
 * nunca al revés. Con documentos adjuntos o ya emitida, exige escribir
 * ELIMINAR (reutiliza `ConfirmDialog.requireTypedConfirmation`).
 */
export function DeleteDeclarationDialog({
  open,
  onClose,
  declaration,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  declaration: DeleteDeclarationSummary;
  onDeleted: () => void;
}) {
  // Se guarda junto al id de la declaración que lo produjo -- así, si se
  // reabre el diálogo para OTRA declaración antes de que termine de
  // resolver, nunca se muestra un conteo obsoleto (currentCount below cae a
  // null hasta que llega el conteo que realmente corresponde).
  const [fetchedCount, setFetchedCount] = useState<{ id: string; count: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("seguro_escolar_attachments")
      .select("id", { count: "exact", head: true })
      .eq("declaration_id", declaration.id)
      .then(({ count }) => {
        if (!cancelled) setFetchedCount({ id: declaration.id, count: count ?? 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [open, declaration.id]);

  const documentCount = fetchedCount?.id === declaration.id ? fetchedCount.count : null;

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    const { data: paths, error } = await supabase.rpc("permanently_delete_seguro_escolar_declaration", {
      p_declaration_id: declaration.id,
    });
    if (error) {
      setLoading(false);
      window.alert(error.message || "No pudimos eliminar la declaración.");
      return;
    }

    if (paths && paths.length > 0) {
      const { error: storageError } = await supabase.storage.from(PRIVATE_BUCKET).remove(paths);
      if (storageError) {
        // La fila ya se eliminó en BD (éxito confirmado arriba) -- no se
        // revierte nada. Queda registrado para limpieza manual del bucket.
        console.error("[DeleteDeclarationDialog] No se pudieron borrar algunos archivos de Storage tras eliminar la declaración:", {
          declarationId: declaration.id,
          paths,
          error: storageError.message,
        });
      }
    }

    setLoading(false);
    onDeleted();
  }

  const requiresTyped = declaration.status !== "borrador" || (documentCount ?? 0) > 0;

  return (
    <ConfirmDialog
      open={open}
      onClose={() => (!loading ? onClose() : undefined)}
      onConfirm={handleDelete}
      title="Eliminar Seguro Escolar"
      description={
        <>
          <p>¿Eliminar este registro de Seguro Escolar?</p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            N.º {declaration.folio} · {declaration.studentName} · {declaration.courseLabel} · {formatDate(declaration.accidentDate)} ·{" "}
            {SEGURO_ESCOLAR_STATUS_LABELS[declaration.status]} · {documentCount ?? "…"} documento{documentCount === 1 ? "" : "s"} adjunto
            {documentCount === 1 ? "" : "s"}
          </p>
          <p className="mt-2">Esta acción eliminará el registro y sus antecedentes asociados. No se puede deshacer.</p>
        </>
      }
      confirmLabel="Eliminar Seguro Escolar"
      requireTypedConfirmation={requiresTyped}
      loading={loading || documentCount === null}
    />
  );
}
