"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { EditCaseModal } from "@/features/convivencia/EditCaseModal";
import type { ConvivenciaCaseTypeRow, ConvivenciaPriority } from "@/types/database";
import type { PersonName } from "@/services/convivencia";

export function CaseActionsMenu({
  caseId,
  caseFolio,
  isFullAdmin,
  title,
  caseTypeId,
  priority,
  responsibleId,
  academicYearId,
  caseTypes,
  managers,
  academicYears,
  contentCount,
}: {
  caseId: string;
  caseFolio: string;
  /** director/superadmin -- solo ellos pueden enviar a la papelera. */
  isFullAdmin: boolean;
  title: string;
  caseTypeId: string;
  priority: ConvivenciaPriority;
  responsibleId: string;
  academicYearId: string;
  caseTypes: ConvivenciaCaseTypeRow[];
  managers: PersonName[];
  academicYears: { id: string; year: number }[];
  contentCount: number;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);

  async function handleSendToTrash() {
    setTrashing(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("send_case_to_trash_administrative", { p_case_id: caseId });
    setTrashing(false);
    if (error) {
      showToast("error", error.message || "No pudimos enviar el expediente a la papelera.");
      return;
    }
    setTrashOpen(false);
    showToast("success", `Expediente N.º ${caseFolio} enviado a la papelera.`);
    router.push("/plataforma/convivencia/casos");
  }

  const items: ActionsMenuItem[] = [{ label: "Editar expediente", icon: Pencil, onSelect: () => setEditOpen(true) }];
  if (isFullAdmin) {
    items.push({ label: "Enviar a la papelera", icon: Trash2, danger: true, onSelect: () => setTrashOpen(true) });
  }

  return (
    <>
      <ActionsMenu items={items} label={`Acciones del caso ${caseFolio}`} />

      <EditCaseModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        caseId={caseId}
        currentTitle={title}
        currentCaseTypeId={caseTypeId}
        currentPriority={priority}
        currentResponsibleId={responsibleId}
        currentAcademicYearId={academicYearId}
        caseTypes={caseTypes}
        managers={managers}
        academicYears={academicYears}
      />

      <ConfirmDialog
        open={trashOpen}
        onClose={() => (!trashing ? setTrashOpen(false) : undefined)}
        onConfirm={handleSendToTrash}
        title="Enviar expediente a la papelera"
        description={
          <>
            ¿Enviar el expediente <strong>N.º {caseFolio}</strong> a la papelera? Dejará de aparecer en los listados normales de Convivencia
            {contentCount > 0 && (
              <>
                {" "}— este expediente tiene <strong>{contentCount}</strong> registro{contentCount === 1 ? "" : "s"} asociado{contentCount === 1 ? "" : "s"} (documentos, entrevistas, medidas, derivaciones), todos se conservan
              </>
            )}
            . Un Director o Superadmin puede restaurarlo desde la papelera en cualquier momento.
          </>
        }
        confirmLabel="Enviar a la papelera"
        loading={trashing}
      />
    </>
  );
}
