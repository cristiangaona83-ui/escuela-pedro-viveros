"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { PRIORITY_LABELS } from "@/features/convivencia/labels";
import type { ConvivenciaCaseTypeRow, ConvivenciaPriority } from "@/types/database";
import type { PersonName } from "@/services/convivencia";

const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABELS) as ConvivenciaPriority[];

/**
 * Edita los datos de identificación del caso (título/tipo/prioridad/
 * responsable/año) -- nunca duplica lo que ya vive en medidas, entrevistas,
 * derivaciones o seguimientos; esos siguen editándose en su propia pestaña.
 * El estado (abierto/cerrado/archivado) sigue viviendo en CaseStatusForm,
 * que no se toca.
 */
export function EditCaseModal({
  open,
  onClose,
  caseId,
  currentTitle,
  currentCaseTypeId,
  currentPriority,
  currentResponsibleId,
  currentAcademicYearId,
  caseTypes,
  managers,
  academicYears,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  currentTitle: string;
  currentCaseTypeId: string;
  currentPriority: ConvivenciaPriority;
  currentResponsibleId: string;
  currentAcademicYearId: string;
  caseTypes: ConvivenciaCaseTypeRow[];
  managers: PersonName[];
  academicYears: { id: string; year: number }[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const caseTypeId = String(form.get("case_type_id") || "");
    const priority = String(form.get("priority") || "") as ConvivenciaPriority;
    const responsibleId = String(form.get("responsible_id") || "");
    const academicYearId = String(form.get("academic_year_id") || "");

    if (!title || !caseTypeId || !priority || !responsibleId || !academicYearId) {
      setError("Completa todos los campos.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("convivencia_cases")
      .update({ title, case_type_id: caseTypeId, priority, responsible_id: responsibleId, academic_year_id: academicYearId })
      .eq("id", caseId);
    if (updateError) {
      setSaving(false);
      setError("No pudimos guardar los cambios.");
      return;
    }

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_type: "caso_editado",
      observation: "Datos del expediente actualizados.",
    });

    await supabase.rpc("log_audit", {
      p_action: "editar_caso",
      p_module: "convivencia",
      p_entity: "convivencia_cases",
      p_entity_id: caseId,
      p_details: { title, case_type_id: caseTypeId, priority, responsible_id: responsibleId },
    });

    setSaving(false);
    showToast("success", "Expediente actualizado.");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={() => (!saving ? onClose() : undefined)} title="Editar expediente" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Título" htmlFor="title" required>
          <Input id="title" name="title" defaultValue={currentTitle} required />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tipo de caso" htmlFor="case_type_id" required>
            <Select id="case_type_id" name="case_type_id" defaultValue={currentCaseTypeId} required>
              {caseTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Prioridad" htmlFor="priority" required>
            <Select id="priority" name="priority" defaultValue={currentPriority} required>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Responsable" htmlFor="responsible_id" required>
            <Select id="responsible_id" name="responsible_id" defaultValue={currentResponsibleId} required>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Año académico" htmlFor="academic_year_id" required>
            <Select id="academic_year_id" name="academic_year_id" defaultValue={currentAcademicYearId} required>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.year}</option>
              ))}
            </Select>
          </FormField>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
