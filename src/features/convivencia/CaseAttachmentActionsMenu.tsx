"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Download, FileSignature, Pencil, Archive, Trash2 } from "lucide-react";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl, uploadPrivateFile, deletePrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { EditCaseAttachmentModal } from "@/features/convivencia/EditCaseAttachmentModal";
import type { CaseAttachmentListItem } from "@/services/convivencia";

/**
 * Reemplaza la fila suelta de botones de cada documento. `canManage` habilita
 * editar/archivar/subir firmada (mismo alcance que ya tenía
 * ArchiveCaseAttachmentButton: director/superadmin/convivencia). `canDelete`
 * es más estricto -- eliminar de verdad (RLS): director/superadmin siempre,
 * convivencia solo mientras el documento sigue en borrador.
 */
export function CaseAttachmentActionsMenu({
  caseId,
  attachment,
  canManage,
  canDelete,
}: {
  caseId: string;
  attachment: CaseAttachmentListItem;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const showToast = useToast();
  const signedFileInputId = useId();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [uploadingSigned, setUploadingSigned] = useState(false);

  async function handleView() {
    const url = await getSignedUrl(attachment.storage_path, 120);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else showToast("error", "No pudimos generar el enlace.");
  }

  async function handleDownload() {
    const url = await getSignedUrl(attachment.storage_path, 120);
    if (!url) {
      showToast("error", "No pudimos generar el enlace de descarga.");
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      showToast("error", "No pudimos descargar el archivo.");
    }
  }

  async function handleSignedFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const inputEl = event.currentTarget;
    if (!file) return;
    setUploadingSigned(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploadingSigned(false);
      showToast("error", "Sesión no válida.");
      return;
    }
    try {
      const path = await uploadPrivateFile(`convivencia/actas/${caseId}`, file, "case_attachment");
      const { data: inserted, error: insertError } = await supabase
        .from("convivencia_attachments")
        .insert({
          case_id: caseId,
          storage_path: path,
          file_name: file.name,
          document_type: "acta_firmada",
          status: "firmada",
          mime_type: file.type || null,
          file_size_bytes: file.size,
          related_attachment_id: attachment.id,
          uploaded_by: user.id,
        })
        .select("id")
        .single();
      if (insertError || !inserted) throw insertError ?? new Error("No pudimos registrar la versión firmada.");

      await supabase.rpc("log_audit", {
        p_action: "subir_acta_firmada",
        p_module: "convivencia",
        p_entity: "convivencia_attachments",
        p_entity_id: inserted.id,
        p_details: { file_name: file.name, related_attachment_id: attachment.id, case_id: caseId },
      });

      setUploadingSigned(false);
      if (inputEl) inputEl.value = "";
      showToast("success", "Versión firmada subida.");
      router.refresh();
    } catch (err) {
      setUploadingSigned(false);
      if (inputEl) inputEl.value = "";
      showToast("error", err instanceof FileValidationError ? err.message : "No pudimos subir el archivo.");
    }
  }

  async function handleArchive() {
    setArchiving(true);
    const supabase = createClient();
    const { error } = await supabase.from("convivencia_attachments").update({ status: "archivada" }).eq("id", attachment.id);
    if (error) {
      setArchiving(false);
      showToast("error", "No pudimos archivar el documento.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "archivar_acta_documento",
      p_module: "convivencia",
      p_entity: "convivencia_attachments",
      p_entity_id: attachment.id,
      p_details: { file_name: attachment.file_name },
    });
    setArchiving(false);
    showToast("success", "Documento archivado.");
    router.refresh();
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    const supabase = createClient();

    const { count } = await supabase
      .from("convivencia_attachments")
      .select("id", { count: "exact", head: true })
      .eq("related_attachment_id", attachment.id);
    if (count && count > 0) {
      setDeleting(false);
      setDeleteOpen(false);
      showToast("error", "No se puede eliminar: existe una versión firmada vinculada a este documento. Elimina primero esa versión firmada.");
      return;
    }

    const { error: deleteError } = await supabase.from("convivencia_attachments").delete().eq("id", attachment.id);
    if (deleteError) {
      setDeleting(false);
      showToast("error", "No pudimos eliminar el documento (revisa tus permisos).");
      return;
    }

    await deletePrivateFile(attachment.storage_path);

    await supabase.rpc("log_audit", {
      p_action: "eliminar_documento_convivencia",
      p_module: "convivencia",
      p_entity: "convivencia_attachments",
      p_entity_id: attachment.id,
      p_details: { file_name: attachment.file_name, case_id: caseId },
    });

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_type: "documento_eliminado",
      observation: `Documento eliminado: ${attachment.title ?? attachment.file_name}.`,
    });

    setDeleting(false);
    setDeleteOpen(false);
    showToast("success", "Documento eliminado.");
    router.refresh();
  }

  const items: ActionsMenuItem[] = [
    { label: "Ver / descargar", icon: Eye, onSelect: handleView },
    { label: "Descargar", icon: Download, onSelect: handleDownload },
  ];
  if (canManage && attachment.document_type !== "acta_firmada") {
    items.push({
      label: uploadingSigned ? "Subiendo…" : "Subir versión firmada",
      icon: FileSignature,
      disabled: uploadingSigned,
      onSelect: () => document.getElementById(signedFileInputId)?.click(),
    });
  }
  if (canManage) {
    items.push({ label: "Editar información", icon: Pencil, onSelect: () => setEditOpen(true) });
  }
  if (canManage && attachment.status !== "archivada") {
    items.push({ label: archiving ? "Archivando…" : "Archivar", icon: Archive, disabled: archiving, onSelect: handleArchive });
  }
  if (canDelete) {
    items.push({ label: "Eliminar", icon: Trash2, danger: true, onSelect: () => setDeleteOpen(true) });
  }

  return (
    <>
      <input id={signedFileInputId} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleSignedFileChange} />
      <ActionsMenu items={items} label={`Acciones de ${attachment.file_name}`} />

      {editOpen && <EditCaseAttachmentModal caseId={caseId} attachment={attachment} open={editOpen} onClose={() => setEditOpen(false)} />}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar documento"
        description={
          <>
            ¿Eliminar permanentemente <strong>{attachment.title ?? attachment.file_name}</strong>? Esta acción borra el archivo de forma
            definitiva (registro y almacenamiento) y no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </>
  );
}
