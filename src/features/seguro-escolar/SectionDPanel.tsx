"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, FileEdit } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import {
  SEGURO_ESCOLAR_INCAPACITY_TYPE_LABELS,
  SEGURO_ESCOLAR_CLOSURE_CAUSE_LABELS,
} from "@/features/seguro-escolar/labels";
import type { DeclarationDetail } from "@/services/seguro-escolar";

/**
 * D. Naturaleza y consecuencia del accidente -- "Para ser llenado por
 * Establecimiento Asistencial". Empieza siempre en blanco (section_d_mode
 * = 'blank'): el PDF se imprime en blanco para que el centro asistencial lo
 * complete a mano. Esta pantalla es solo para TRANSCRIBIR digitalmente lo
 * que el centro asistencial devolvió ya completado en papel -- nunca para
 * que el establecimiento educacional invente un diagnóstico. El documento
 * escaneado original queda como respaldo obligatorio en Documentos
 * adjuntos, no lo reemplaza.
 */
export function SectionDPanel({ declaration, canManage }: { declaration: DeclarationDetail; canManage: boolean }) {
  const router = useRouter();
  const showToast = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitalization, setHospitalization] = useState(declaration.hospitalization ?? false);
  const [incapacity, setIncapacity] = useState(declaration.incapacity ?? false);

  const isBlank = declaration.section_d_mode === "blank";

  async function handleSave(formData: FormData) {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const patch = {
      section_d_mode: "transcribed" as const,
      assistance_establishment: String(formData.get("assistance_establishment") || "").trim() || null,
      health_service_code: String(formData.get("health_service_code") || "").trim() || null,
      establishment_code: String(formData.get("establishment_code") || "").trim() || null,
      medical_diagnosis: String(formData.get("medical_diagnosis") || "").trim() || null,
      body_part_affected: String(formData.get("body_part_affected") || "").trim() || null,
      hospitalization,
      hospitalization_days: hospitalization && formData.get("hospitalization_days") ? Number(formData.get("hospitalization_days")) : null,
      incapacity,
      incapacity_days: incapacity && formData.get("incapacity_days") ? Number(formData.get("incapacity_days")) : null,
      incapacity_type: (String(formData.get("incapacity_type") || "") || null) as DeclarationDetail["incapacity_type"],
      case_closure_cause: (String(formData.get("case_closure_cause") || "") || null) as DeclarationDetail["case_closure_cause"],
      case_closure_date: String(formData.get("case_closure_date") || "") || null,
    };

    const { error: updateError } = await supabase.from("seguro_escolar_declarations").update(patch).eq("id", declaration.id);
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "registrar_seccion_d_seguro_escolar",
      p_module: "seguro_escolar",
      p_entity: "seguro_escolar_declarations",
      p_entity_id: declaration.id,
    });

    setLoading(false);
    setEditing(false);
    showToast("success", "Antecedentes del establecimiento asistencial registrados.");
    router.refresh();
  }

  if (isBlank && !editing) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">D. Naturaleza y consecuencia del accidente</h3>
          <p className="text-sm text-slate-500">
            Esta sección se imprime en blanco en el PDF -- la completa el Establecimiento Asistencial en el documento físico. Cuando
            recibas el documento devuelto, transcribe aquí los antecedentes y adjunta el escaneado original como respaldo.
          </p>
          {canManage && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <FileEdit className="h-4 w-4" /> Registrar antecedentes devueltos por establecimiento asistencial
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  if (!editing) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">D. Naturaleza y consecuencia del accidente</h3>
            {canManage && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <FileEdit className="h-4 w-4" /> Editar
              </Button>
            )}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-400">Establecimiento asistencial</dt><dd className="text-slate-800">{declaration.assistance_establishment ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Código S.S. — Establec.</dt><dd className="text-slate-800">{declaration.health_service_code ?? "—"} — {declaration.establishment_code ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Diagnóstico médico</dt><dd className="text-slate-800">{declaration.medical_diagnosis ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Parte del cuerpo afectada</dt><dd className="text-slate-800">{declaration.body_part_affected ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Hospitalización</dt><dd className="text-slate-800">{declaration.hospitalization ? `Sí — ${declaration.hospitalization_days ?? "—"} día(s)` : "No"}</dd></div>
            <div><dt className="text-xs text-slate-400">Incapacidad</dt><dd className="text-slate-800">{declaration.incapacity ? `Sí — ${declaration.incapacity_days ?? "—"} día(s)` : "No"}</dd></div>
            <div><dt className="text-xs text-slate-400">Tipo de incapacidad</dt><dd className="text-slate-800">{declaration.incapacity_type ? SEGURO_ESCOLAR_INCAPACITY_TYPE_LABELS[declaration.incapacity_type] : "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Causa de cierre del caso</dt><dd className="text-slate-800">{declaration.case_closure_cause ? SEGURO_ESCOLAR_CLOSURE_CAUSE_LABELS[declaration.case_closure_cause] : "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Fecha de cierre del caso</dt><dd className="text-slate-800">{declaration.case_closure_date ? formatDate(declaration.case_closure_date) : "—"}</dd></div>
          </dl>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
        >
          <h3 className="text-sm font-semibold text-slate-900">D. Naturaleza y consecuencia del accidente</h3>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Transcribe exactamente lo que indicó el Establecimiento Asistencial en el documento devuelto. Conserva el documento
            escaneado original en Documentos adjuntos.
          </p>

          <FormField label="Establecimiento asistencial" htmlFor="assistance_establishment">
            <Input id="assistance_establishment" name="assistance_establishment" defaultValue={declaration.assistance_establishment ?? ""} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Código Servicio de Salud" htmlFor="health_service_code">
              <Input id="health_service_code" name="health_service_code" defaultValue={declaration.health_service_code ?? ""} />
            </FormField>
            <FormField label="Código establecimiento" htmlFor="establishment_code">
              <Input id="establishment_code" name="establishment_code" defaultValue={declaration.establishment_code ?? ""} />
            </FormField>
          </div>
          <FormField label="Diagnóstico médico" htmlFor="medical_diagnosis">
            <Textarea id="medical_diagnosis" name="medical_diagnosis" rows={3} defaultValue={declaration.medical_diagnosis ?? ""} />
          </FormField>
          <FormField label="Parte del cuerpo afectada" htmlFor="body_part_affected">
            <Input id="body_part_affected" name="body_part_affected" defaultValue={declaration.body_part_affected ?? ""} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <FormField label="Hospitalización" htmlFor="hospitalization_flag">
                <Select id="hospitalization_flag" value={hospitalization ? "1" : "2"} onChange={(e) => setHospitalization(e.target.value === "1")}>
                  <option value="2">No (2)</option>
                  <option value="1">Sí (1)</option>
                </Select>
              </FormField>
              {hospitalization && (
                <div className="mt-2">
                  <FormField label="Total días hospitalización" htmlFor="hospitalization_days">
                    <Input id="hospitalization_days" name="hospitalization_days" type="number" min="0" defaultValue={declaration.hospitalization_days ?? undefined} />
                  </FormField>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <FormField label="Incapacidad" htmlFor="incapacity_flag">
                <Select id="incapacity_flag" value={incapacity ? "1" : "2"} onChange={(e) => setIncapacity(e.target.value === "1")}>
                  <option value="2">No (2)</option>
                  <option value="1">Sí (1)</option>
                </Select>
              </FormField>
              {incapacity && (
                <div className="mt-2">
                  <FormField label="Total días incapacidad" htmlFor="incapacity_days">
                    <Input id="incapacity_days" name="incapacity_days" type="number" min="0" defaultValue={declaration.incapacity_days ?? undefined} />
                  </FormField>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Tipo de incapacidad" htmlFor="incapacity_type">
              <Select id="incapacity_type" name="incapacity_type" defaultValue={declaration.incapacity_type ?? ""}>
                <option value="">—</option>
                {Object.entries(SEGURO_ESCOLAR_INCAPACITY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Causa de cierre del caso" htmlFor="case_closure_cause">
              <Select id="case_closure_cause" name="case_closure_cause" defaultValue={declaration.case_closure_cause ?? ""}>
                <option value="">—</option>
                {Object.entries(SEGURO_ESCOLAR_CLOSURE_CAUSE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Fecha de cierre del caso" htmlFor="case_closure_date">
              <Input id="case_closure_date" name="case_closure_date" type="date" defaultValue={declaration.case_closure_date ?? ""} />
            </FormField>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar antecedentes"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
