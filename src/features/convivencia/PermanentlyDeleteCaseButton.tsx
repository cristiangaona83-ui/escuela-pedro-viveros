"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { deletePrivateFile } from "@/lib/supabase/storage";

/**
 * Eliminación DEFINITIVA -- exclusiva Director/Superadmin, y solo sobre un
 * caso que ya está en la papelera (la RPC lo exige). Orden seguro: primero
 * se leen las rutas de Storage de todo lo que se va a perder en la cascada
 * (documentos del caso + actas y sus adjuntos, vía case_minutes), LUEGO se
 * llama la RPC (que hace el DELETE real en una sola transacción), y solo si
 * eso tiene éxito se borran los archivos de Storage -- así nunca se borra un
 * archivo cuya fila todavía existe. Los informes del psicólogo NO se tocan:
 * psychologist_reports.case_id usa ON DELETE SET NULL, sobreviven.
 */
export function PermanentlyDeleteCaseButton({ caseId, caseFolio, caseTitle }: { caseId: string; caseFolio: string; caseTitle: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const supabase = createClient();

    const [{ data: attachmentRows }, { data: minuteRows }] = await Promise.all([
      supabase.from("convivencia_attachments").select("storage_path").eq("case_id", caseId),
      supabase.from("case_minutes").select("id").eq("case_id", caseId),
    ]);

    let minuteAttachmentPaths: string[] = [];
    const minuteIds = (minuteRows ?? []).map((m) => m.id);
    if (minuteIds.length > 0) {
      const { data: minuteAttachments } = await supabase
        .from("case_minute_attachments")
        .select("storage_path")
        .in("minute_id", minuteIds);
      minuteAttachmentPaths = (minuteAttachments ?? []).map((a) => a.storage_path);
    }
    const storagePaths = [...(attachmentRows ?? []).map((a) => a.storage_path), ...minuteAttachmentPaths];

    const { error } = await supabase.rpc("permanently_delete_case_administrative", { p_case_id: caseId });
    if (error) {
      setLoading(false);
      showToast("error", error.message || "No pudimos eliminar el expediente.");
      return;
    }

    await Promise.all(storagePaths.map((path) => deletePrivateFile(path)));

    setLoading(false);
    setOpen(false);
    showToast("success", `Expediente N.º ${caseFolio} eliminado definitivamente.`);
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600">
        <Trash2 className="h-4 w-4" /> Eliminar definitivamente
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => (!loading ? setOpen(false) : undefined)}
        onConfirm={handleConfirm}
        title="Eliminar expediente definitivamente"
        description={
          <>
            Esto elimina para siempre el expediente <strong>N.º {caseFolio}</strong> ({caseTitle}) y todo su contenido asociado (documentos,
            entrevistas, medidas, seguimientos, derivaciones, actas y la línea de tiempo). <strong>No se puede deshacer.</strong> Los informes
            del psicólogo vinculados se conservan, sin vínculo al caso.
          </>
        }
        confirmLabel="Eliminar definitivamente"
        requireTypedConfirmation
        loading={loading}
      />
    </>
  );
}
