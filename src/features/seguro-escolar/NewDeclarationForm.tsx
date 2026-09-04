"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, AlertCircle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { splitLastNames, accidentWeekday, WEEKDAY_LABELS } from "@/features/seguro-escolar/utils";
import type { SeguroEscolarStudentContext } from "@/services/seguro-escolar";
import type { SeguroEscolarAccidentType } from "@/types/database";

const CIRCUMSTANCE_MAX = 900;

/**
 * Formulario de creación -- Secciones A/B/C del Formulario 0374-3 (la D
 * queda siempre en blanco al crear: "Para ser llenado por Establecimiento
 * Asistencial", se completa después desde la ficha del expediente). Escribe
 * directo con el cliente de Supabase, respaldado por RLS
 * (`seguro_escolar_declarations_insert`: director/superadmin/
 * inspectoria_general) -- mismo patrón que el resto de formularios de la
 * plataforma (SituationForm, EvaluationFormModal), sin Server Actions.
 */
export function NewDeclarationForm({ student, userId }: { student: SeguroEscolarStudentContext; userId: string }) {
  const router = useRouter();
  const initialSplit = useMemo(() => splitLastNames(student.lastNames), [student.lastNames]);
  const initialBirthYear = student.birthDate ? new Date(student.birthDate).getUTCFullYear() : null;
  const initialAge = student.birthDate
    ? Math.floor((new Date().getTime() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const [accidentType, setAccidentType] = useState<SeguroEscolarAccidentType>("escuela");
  const [accidentDate, setAccidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [circumstance, setCircumstance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const weekday = accidentDate ? accidentWeekday(accidentDate) : null;

  async function handleSubmit(status: "borrador" | "emitido") {
    if (!formRef.current) return;
    setLoading(true);
    setError(null);
    const form = new FormData(formRef.current);
    const supabase = createClient();

    const registrationDate = String(form.get("registration_date") || new Date().toISOString().slice(0, 10));
    const year = new Date(registrationDate).getFullYear();

    const { data: folioNumber, error: folioError } = await supabase.rpc("next_seguro_escolar_folio", { p_year: year });
    if (folioError || folioNumber === null) {
      setLoading(false);
      setError(folioError?.message || "No pudimos generar el número correlativo.");
      return;
    }

    const payload = {
      folio_year: year,
      folio_number: folioNumber,
      student_id: student.studentId,
      registration_date: registrationDate,
      course_label: String(form.get("course_label") || student.courseLabel || ""),
      course_id: student.courseId,
      schedule: String(form.get("schedule") || "").trim() || null,
      student_last_name_paterno: String(form.get("last_name_paterno") || "").trim() || null,
      student_last_name_materno: String(form.get("last_name_materno") || "").trim() || null,
      student_first_names: String(form.get("first_names") || student.firstNames),
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
      status,
      created_by: userId,
    };

    if (!payload.circumstance) {
      setLoading(false);
      setError("Describe la circunstancia del accidente.");
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("seguro_escolar_declarations")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !inserted) {
      setLoading(false);
      setError(insertError?.message || "No pudimos guardar la declaración.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: status === "emitido" ? "emitir_declaracion_seguro_escolar" : "crear_declaracion_seguro_escolar",
      p_module: "seguro_escolar",
      p_entity: "seguro_escolar_declarations",
      p_entity_id: inserted.id,
      p_details: { folio_year: year, folio_number: folioNumber },
    });

    router.push(`/plataforma/seguro-escolar/${inserted.id}`);
  }

  return (
    <form ref={formRef} className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">A. Individualización del establecimiento</h3>
            <Badge tone="neutral">
              {student.courseLabel ? `Curso: ${student.courseLabel}` : "Sin matrícula activa"}
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Curso" htmlFor="course_label" required>
              <Input id="course_label" name="course_label" defaultValue={student.courseLabel ?? ""} required />
            </FormField>
            <FormField label="Horario" htmlFor="schedule" hint="Diurno, vespertino, nocturno…">
              <Input id="schedule" name="schedule" />
            </FormField>
            <FormField label="Fecha registro de los datos" htmlFor="registration_date" required>
              <Input id="registration_date" name="registration_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">B. Individualización del accidentado</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Apellido paterno" htmlFor="last_name_paterno" hint={!initialSplit.paterno ? "Falta información de ficha" : undefined}>
              <Input id="last_name_paterno" name="last_name_paterno" defaultValue={initialSplit.paterno} />
            </FormField>
            <FormField label="Apellido materno" htmlFor="last_name_materno" hint={!initialSplit.materno ? "Falta información de ficha" : undefined}>
              <Input id="last_name_materno" name="last_name_materno" defaultValue={initialSplit.materno} />
            </FormField>
            <FormField label="Nombres" htmlFor="first_names" required>
              <Input id="first_names" name="first_names" defaultValue={student.firstNames} required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Sexo" htmlFor="sex" hint="M = 1, F = 2">
              <Select id="sex" name="sex" defaultValue={student.sex ?? ""}>
                <option value="">—</option>
                <option value="M">Masculino (1)</option>
                <option value="F">Femenino (2)</option>
              </Select>
            </FormField>
            <FormField label="Año nacimiento" htmlFor="birth_year" hint={!student.birthDate ? "Falta información de ficha" : undefined}>
              <Input id="birth_year" name="birth_year" type="number" defaultValue={initialBirthYear ?? undefined} />
            </FormField>
            <FormField label="Edad" htmlFor="age" hint={!student.birthDate ? "Falta información de ficha" : undefined}>
              <Input id="age" name="age" type="number" defaultValue={initialAge ?? undefined} />
            </FormField>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Residencia habitual</p>
            <div className="grid gap-4 sm:grid-cols-5">
              <FormField label="Calle" htmlFor="residence_street" hint={!student.addressStreet ? "Falta información de ficha" : undefined}>
                <Input id="residence_street" name="residence_street" defaultValue={student.addressStreet ?? ""} />
              </FormField>
              <FormField label="Número" htmlFor="residence_number" hint={!student.addressNumber ? "Falta información de ficha" : undefined}>
                <Input id="residence_number" name="residence_number" defaultValue={student.addressNumber ?? ""} />
              </FormField>
              <FormField label="Población/Villa" htmlFor="residence_population" hint={!student.addressSector ? "Falta información de ficha" : undefined}>
                <Input id="residence_population" name="residence_population" defaultValue={student.addressSector ?? ""} />
              </FormField>
              <FormField label="Comuna" htmlFor="residence_commune" hint={!student.addressCommune ? "Falta información de ficha" : undefined}>
                <Input id="residence_commune" name="residence_commune" defaultValue={student.addressCommune ?? ""} />
              </FormField>
              <FormField label="Ciudad" htmlFor="residence_city">
                <Input id="residence_city" name="residence_city" defaultValue={student.addressRegion ?? ""} />
              </FormField>
            </div>
            <div className="mt-4 max-w-[160px]">
              <FormField label="Codif. comuna" htmlFor="residence_commune_code" hint="Si corresponde y existe">
                <Input id="residence_commune_code" name="residence_commune_code" />
              </FormField>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">C. Informe sobre el accidente</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label="Hora" htmlFor="accident_hour">
              <Input id="accident_hour" name="accident_hour" type="number" min="0" max="23" />
            </FormField>
            <FormField label="Minutos" htmlFor="accident_minute">
              <Input id="accident_minute" name="accident_minute" type="number" min="0" max="59" />
            </FormField>
            <FormField label="Fecha del accidente" htmlFor="accident_date" required>
              <Input
                id="accident_date"
                name="accident_date"
                type="date"
                required
                value={accidentDate}
                onChange={(e) => setAccidentDate(e.target.value)}
              />
            </FormField>
            <FormField label="Día accidente" htmlFor="weekday_display" hint="Calculado automáticamente">
              <Input id="weekday_display" readOnly disabled value={weekday ? `${WEEKDAY_LABELS[weekday]} (${weekday})` : "—"} />
            </FormField>
          </div>

          <FormField label="Accidente" htmlFor="accident_type" required>
            <Select id="accident_type" name="accident_type" value={accidentType} onChange={(e) => setAccidentType(e.target.value as SeguroEscolarAccidentType)}>
              <option value="escuela">En la escuela (2)</option>
              <option value="trayecto">De trayecto (1)</option>
            </Select>
          </FormField>

          {accidentType === "trayecto" && (
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Testigos (en caso de trayecto)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Nombre (A)" htmlFor="witness_a_name">
                    <Input id="witness_a_name" name="witness_a_name" />
                  </FormField>
                  <FormField label="Apellido (A)" htmlFor="witness_a_lastname">
                    <Input id="witness_a_lastname" name="witness_a_lastname" />
                  </FormField>
                  <FormField label="C. Nac. Id. (A)" htmlFor="witness_a_id">
                    <Input id="witness_a_id" name="witness_a_id" />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Nombre (B)" htmlFor="witness_b_name">
                    <Input id="witness_b_name" name="witness_b_name" />
                  </FormField>
                  <FormField label="Apellido (B)" htmlFor="witness_b_lastname">
                    <Input id="witness_b_lastname" name="witness_b_lastname" />
                  </FormField>
                  <FormField label="C. Nac. Id. (B)" htmlFor="witness_b_id">
                    <Input id="witness_b_id" name="witness_b_id" />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          <FormField label="Circunstancia del accidente" htmlFor="circumstance" required hint="Describa objetivamente cómo ocurrió, lugar, actividad y mecanismo -- sin diagnósticos ni responsabilidades.">
            <Textarea
              id="circumstance"
              name="circumstance"
              required
              rows={5}
              maxLength={CIRCUMSTANCE_MAX}
              value={circumstance}
              onChange={(e) => setCircumstance(e.target.value)}
            />
          </FormField>
          <p className="-mt-2 text-right text-xs text-slate-400">{circumstance.length}/{CIRCUMSTANCE_MAX}</p>
        </CardBody>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => handleSubmit("borrador")}>
          <Save className="h-4 w-4" /> Guardar borrador
        </Button>
        <Button type="button" disabled={loading} onClick={() => handleSubmit("emitido")}>
          <Send className="h-4 w-4" /> {loading ? "Guardando…" : "Finalizar declaración"}
        </Button>
      </div>
    </form>
  );
}
