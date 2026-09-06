"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Download, Pencil, FileUp, Archive, Trash2 } from "lucide-react";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl, deletePublicFile, deletePrivateFile, pathFromPublicUrl } from "@/lib/supabase/storage";
import { EditCircularModal } from "./EditCircularModal";
import { ReplaceCircularFileDialog } from "./ReplaceCircularFileDialog";
import type { CircularListItem } from "@/services/documents";

async function openCircularFile(circular: CircularListItem) {
  if (circular.is_public) {
    window.open(circular.file_url, "_blank", "noopener,noreferrer");
    return;
  }
  const url = await getSignedUrl(circular.file_url, 60);
  if (!url) {
    window.alert("No pudimos generar el enlace del archivo. Inténtalo nuevamente.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function CircularRowActions({ circular, canManage }: { circular: CircularListItem; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleArchive() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("documents").update({ status: "archivada" }).eq("id", circular.id);
    if (error) {
      setBusy(false);
      window.alert("No pudimos archivar la circular.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "archivar_circular_informativa",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: circular.id,
      p_details: { title: circular.title },
    });
    setBusy(false);
    setConfirmingArchive(false);
    router.refresh();
  }

  async function handleDelete() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("documents").delete().eq("id", circular.id);
    if (error) {
      setBusy(false);
      window.alert("No pudimos eliminar la circular.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "eliminar_circular_informativa",
      p_module: "documentos",
      p_entity: "documents",
      p_entity_id: circular.id,
      p_details: { title: circular.title, document_number: circular.document_number },
    });

    if (circular.is_public) {
      const path = pathFromPublicUrl(circular.file_url);
      if (path) void deletePublicFile(path);
    } else {
      void deletePrivateFile(circular.file_url);
    }

    setBusy(false);
    setConfirmingDelete(false);
    router.refresh();
  }

  const items: ActionsMenuItem[] = [
    { label: "Ver", icon: Eye, onSelect: () => void openCircularFile(circular) },
    { label: "Descargar", icon: Download, onSelect: () => void openCircularFile(circular) },
  ];

  if (canManage) {
    items.push(
      { label: "Editar", icon: Pencil, onSelect: () => setEditing(true) },
      { label: "Reemplazar archivo", icon: FileUp, onSelect: () => setReplacing(true) }
    );
    if (circular.status !== "archivada") {
      items.push({ label: "Archivar", icon: Archive, onSelect: () => setConfirmingArchive(true) });
    }
    items.push({ label: "Eliminar", icon: Trash2, danger: true, onSelect: () => setConfirmingDelete(true) });
  }

  return (
    <>
      <ActionsMenu items={items} label={`Acciones para ${circular.title}`} />

      {canManage && editing && <EditCircularModal open={editing} onClose={() => setEditing(false)} circular={circular} />}
      {canManage && replacing && <ReplaceCircularFileDialog open={replacing} onClose={() => setReplacing(false)} circular={circular} />}

      <ConfirmDialog
        open={confirmingArchive}
        onClose={() => (!busy ? setConfirmingArchive(false) : undefined)}
        onConfirm={handleArchive}
        title="Archivar circular"
        description={<p>¿Archivar “{circular.title}”? Dejará de aparecer como vigente, pero se conserva en el listado.</p>}
        confirmLabel="Archivar"
        loading={busy}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => (!busy ? setConfirmingDelete(false) : undefined)}
        onConfirm={handleDelete}
        title="Eliminar circular"
        description={<p>¿Eliminar “{circular.title}”? Esta acción no se puede deshacer.</p>}
        confirmLabel="Eliminar"
        loading={busy}
      />
    </>
  );
}
