"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { accidentWeekday, WEEKDAY_LABELS } from "@/features/seguro-escolar/utils";
import type { DeclarationDetail } from "@/services/seguro-escolar";
import type { SeguroEscolarAccidentType } from "@/types/database";

/**
 * Edita las Secciones A/B/C de una declaración ya creada -- mismos campos
 * que NewDeclarationForm, ahora sobre una fila existente (UPDATE en vez de
 * INSERT). Disponible en cualquier estado (una declaración emitida no se
 * bloquea a nivel de base de datos), pero si ya no está en 'borrador' la
 * corrección queda auditada con una acción distinta
 * ('editar_declaracion_emitida'), conforme a "no debe poder modificarse
 * silenciosamente" del pedido.
 */
export function EditDeclarationModal({ open, onClose, declaration }: { open: boolean; onClose: () => void; declaration: DeclarationDetail }) {
  const router = useRouter();
  const showToast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [accidentType, setAccidentType] = useState<SeguroEscolarAccidentType>(declaration.accident_type);
  const [accidentDate, setAccidentDate] = useState(declaration.accident_date);
  const [circumstance, setCircumstance] = useState(declaration.circumstance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekday = accidentDate ? accidentWeekday(accidentDate) : null;

  async function handleSave() {
    if (!formRef.current) return;
    setLoading(true);
    setError(null);
    const form = new FormData(formRef.current);
    const supabase = createClient();

    const patch = {
      registration_date: String(form.get("registration_date") || declaration.registration_date),
      course_label: String(form.get("course_label") || declaration.course_label),
      schedule: String(form.get("schedule") || "").trim() || null,
      student_last_name_paterno: String(form.get("last_name_paterno") || "").trim() || null,
      student_last_name_materno: String(form.get("last_name_materno") || "").trim() || null,
      student_first_names: String(form.get("first_names") || declaration.student_first_names),
      student_sex: (String(form.get("sex") || "") || null) as "M" | "F" | null,
      student_birth_year: form.get("birth_year") ? Number(form.get("birth_year")) : null,
      student_age: form.get("age") ? Number(form.get("age")) : null,
      residence_street: String(form.get("residence_street") || "").trim() || null,
      residence_number: String(form.get("residence_number") || "").trim() || null,
      residence_population: String(form.get("residence_population") || "").trim() || null,
      residence_commune: String(form.get("residence_commune") || "").trim() || null,
      residence_city: String(form.get("residence_city") || "").trim() || null,
      residence_commune_code: String(form.get("residence_commune_code") || "").trim() || null,
      accident_date: accidentDate,
      accident_hour: form.get("accident_hour") !== "" ? Number(form.get("accident_hour")) : null,
      accident_minute: form.get("accident_minute") !== "" ? Number(form.get("accident_minute")) : null,
      accident_type: accidentType,
      circumstance: circumstance.trim(),
      witness_a_name: accidentType === "trayecto" ? String(form.get("witness_a_name") || "").trim() || null : null,
      witness_a_lastname: accidentType === "trayecto" ? String(form.get("witness_a_lastname") || "").trim() || null : null,
      witness_a_id: accidentType === "trayecto" ? String(form.get("witness_a_id") || "").trim() || null : null,
      witness_b_name: accidentType === "trayecto" ? String(form.get("witness_b_name") || "").trim() || null : null,
      witness_b_lastname: accidentType === "trayecto" ? String(form.get("witness_b_lastname") || "").trim() || null : null,
      witness_b_id: accidentType === "trayecto" ? String(form.get("witness_b_id") || "").trim() || null : null,
    };

    if (!patch.circumstance) {
      setLoading(false);
      setError("Describe la circunstancia del accidente.");
      return;
    }

    const { error: updateError } = await supabase.from("seguro_escolar_declarations").update(patch).eq("id", declaration.id);
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: declaration.status === "borrador" ? "editar_declaracion_seguro_escolar" : "editar_declaracion_emitida",
      p_module: "seguro_escolar",
      p_entity: "seguro_escolar_declarations",
      p_entity_id: declaration.id,
      p_details: { previous_status: declaration.status },
    });

    setLoading(false);
    showToast("success", "Declaración actualizada.");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={() => (!loading ? onClose() : undefined)} title="Editar declaración" maxWidth="max-w-3xl">
      <form ref={formRef} className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        {declaration.status !== "borrador" && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" /> Esta declaración ya fue emitida. La corrección quedará registrada en auditoría.
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">A. Individualización del establecimiento</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Curso" htmlFor="course_label" required>
              <Input id="course_label" name="course_label" defaultValue={declaration.course_label} required />
            </FormField>
            <FormField label="Horario" htmlFor="schedule">
              <Input id="schedule" name="schedule" defaultValue={declaration.schedule ?? ""} />
            </FormField>
            <FormField label="Fecha registro de los datos" htmlFor="registration_date" required>
              <Input id="registration_date" name="registration_date" type="date" required defaultValue={declaration.registration_date} />
            </FormField>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">B. Individualización del accidentado</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Apellido paterno" htmlFor="last_name_paterno">
              <Input id="last_name_paterno" name="last_name_paterno" defaultValue={declaration.student_last_name_paterno ?? ""} />
            </FormField>
            <FormField label="Apellido materno" htmlFor="last_name_materno">
              <Input id="last_name_materno" name="last_name_materno" defaultValue={declaration.student_last_name_materno ?? ""} />
            </FormField>
            <FormField label="Nombres" htmlFor="first_names" required>
              <Input id="first_names" name="first_names" defaultValue={declaration.student_first_names} required />
            </FormField>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <FormField label="Sexo" htmlFor="sex">
              <Select id="sex" name="sex" defaultValue={declaration.student_sex ?? ""}>
                <option value="">—</option>
                <option value="M">Masculino (1)</option>
                <option value="F">Femenino (2)</option>
              </Select>
            </FormField>
            <FormField label="Año nacimiento" htmlFor="birth_year">
              <Input id="birth_year" name="birth_year" type="number" defaultValue={declaration.student_birth_year ?? undefined} />
            </FormField>
            <FormField label="Edad" htmlFor="age">
              <Input id="age" name="age" type="number" defaultValue={declaration.student_age ?? undefined} />
            </FormField>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Residencia habitual</p>
            <div className="grid gap-4 sm:grid-cols-5">
              <FormField label="Calle" htmlFor="residence_street">
                <Input id="residence_street" name="residence_street" defaultValue={declaration.residence_street ?? ""} />
              </FormField>
              <FormField label="Número" htmlFor="residence_number">
                <Input id="residence_number" name="residence_number" defaultValue={declaration.residence_number ?? ""} />
              </FormField>
              <FormField label="Población/Villa" htmlFor="residence_population">
                <Input id="residence_population" name="residence_population" defaultValue={declaration.residence_population ?? ""} />
              </FormField>
              <FormField label="Comuna" htmlFor="residence_commune">
                <Input id="residence_commune" name="residence_commune" defaultValue={declaration.residence_commune ?? ""} />
              </FormField>
              <FormField label="Ciudad" htmlFor="residence_city">
                <Input id="residence_city" name="residence_city" defaultValue={declaration.residence_city ?? ""} />
              </FormField>
            </div>
            <div className="mt-4 max-w-[160px]">
              <FormField label="Codif. comuna" htmlFor="residence_commune_code">
                <Input id="residence_commune_code" name="residence_commune_code" defaultValue={declaration.residence_commune_code ?? ""} />
              </FormField>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">C. Informe sobre el accidente</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Hora" htmlFor="accident_hour">
              <Input id="accident_hour" name="accident_hour" type="number" min="0" max="23" defaultValue={declaration.accident_hour ?? undefined} />
            </FormField>
            <FormField label="Minutos" htmlFor="accident_minute">
              <Input id="accident_minute" name="accident_minute" type="number" min="0" max="59" defaultValue={declaration.accident_minute ?? undefined} />
            </FormField>
            <FormField label="Fecha del accidente" htmlFor="accident_date" required>
              <Input id="accident_date" name="accident_date" type="date" required value={accidentDate} onChange={(e) => setAccidentDate(e.target.value)} />
            </FormField>
            <FormField label="Día accidente" htmlFor="weekday_display" hint="Calculado automáticamente">
              <Input id="weekday_display" readOnly disabled value={weekday ? `${WEEKDAY_LABELS[weekday]} (${weekday})` : "—"} />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Accidente" htmlFor="accident_type" required>
              <Select id="accident_type" name="accident_type" value={accidentType} onChange={(e) => setAccidentType(e.target.value as SeguroEscolarAccidentType)}>
                <option value="escuela">En la escuela (2)</option>
                <option value="trayecto">De trayecto (1)</option>
              </Select>
            </FormField>
          </div>

          {accidentType === "trayecto" && (
            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Testigos (en caso de trayecto)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Nombre (A)" htmlFor="witness_a_name">
                    <Input id="witness_a_name" name="witness_a_name" defaultValue={declaration.witness_a_name ?? ""} />
                  </FormField>
                  <FormField label="Apellido (A)" htmlFor="witness_a_lastname">
                    <Input id="witness_a_lastname" name="witness_a_lastname" defaultValue={declaration.witness_a_lastname ?? ""} />
                  </FormField>
                  <FormField label="C. Nac. Id. (A)" htmlFor="witness_a_id">
                    <Input id="witness_a_id" name="witness_a_id" defaultValue={declaration.witness_a_id ?? ""} />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Nombre (B)" htmlFor="witness_b_name">
                    <Input id="witness_b_name" name="witness_b_name" defaultValue={declaration.witness_b_name ?? ""} />
                  </FormField>
                  <FormField label="Apellido (B)" htmlFor="witness_b_lastname">
                    <Input id="witness_b_lastname" name="witness_b_lastname" defaultValue={declaration.witness_b_lastname ?? ""} />
                  </FormField>
                  <FormField label="C. Nac. Id. (B)" htmlFor="witness_b_id">
                    <Input id="witness_b_id" name="witness_b_id" defaultValue={declaration.witness_b_id ?? ""} />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <FormField label="Circunstancia del accidente" htmlFor="circumstance" required>
              <Textarea id="circumstance" name="circumstance" required rows={5} maxLength={900} value={circumstance} onChange={(e) => setCircumstance(e.target.value)} />
            </FormField>
            <p className="mt-1 text-right text-xs text-slate-400">{circumstance.length}/900</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
