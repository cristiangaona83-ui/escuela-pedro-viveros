"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { StudentMultiPicker, type SelectedStudent } from "@/features/convivencia/StudentMultiPicker";
import { createClient } from "@/lib/supabase/client";
import type { ConvivenciaCaseTypeRow } from "@/types/database";
import type { StudentName } from "@/services/convivencia";

/** Registro de situación (punto 4). Al guardar, inserta la situación y sus
 * estudiantes vinculados, registra en log_audit, y redirige a la ficha de
 * la situación donde se puede "Convertir en Caso" o dejarla como registro
 * simple. */
export function SituationForm({ caseTypes, students }: { caseTypes: ConvivenciaCaseTypeRow[]; students: StudentName[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedStudent[]>([]);
  const [needsFollowup, setNeedsFollowup] = useState(false);
  const [needsProtocol, setNeedsProtocol] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selected.length === 0) {
      setError("Agrega al menos un estudiante.");
      return;
    }

    setLoading(true);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const payload = {
      occurred_on: String(form.get("occurred_on") || ""),
      occurred_time: String(form.get("occurred_time") || "") || null,
      location: String(form.get("location") || "").trim() || null,
      case_type_id: String(form.get("case_type_id") || ""),
      description: String(form.get("description") || "").trim(),
      people_present: String(form.get("people_present") || "").trim() || null,
      witnesses: String(form.get("witnesses") || "").trim() || null,
      immediate_action: String(form.get("immediate_action") || "").trim() || null,
      needs_followup: needsFollowup,
      needs_protocol: needsProtocol,
      observations: String(form.get("observations") || "").trim() || null,
      reported_by: user.id,
    };

    if (!payload.occurred_on || !payload.case_type_id || !payload.description) {
      setLoading(false);
      setError("Completa fecha, tipo de situación y descripción.");
      return;
    }

    const { data: situation, error: insertError } = await supabase.from("convivencia_situations").insert(payload).select("id").single();
    if (insertError || !situation) {
      setLoading(false);
      setError("No pudimos guardar la situación.");
      return;
    }

    const { error: linkError } = await supabase
      .from("convivencia_situation_students")
      .insert(selected.map((s) => ({ situation_id: situation.id, student_id: s.student_id, role: s.role })));
    if (linkError) {
      setLoading(false);
      setError("La situación se guardó, pero no pudimos vincular a todos los estudiantes.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "crear_situacion",
      p_module: "convivencia",
      p_entity: "convivencia_situations",
      p_entity_id: situation.id,
      p_details: { case_type_id: payload.case_type_id, student_count: selected.length },
    });

    setLoading(false);
    router.push(`/plataforma/convivencia/situaciones/${situation.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Fecha" htmlFor="occurred_on" required>
          <Input id="occurred_on" name="occurred_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Hora" htmlFor="occurred_time" hint="Opcional">
          <Input id="occurred_time" name="occurred_time" type="time" />
        </FormField>
      </div>

      <FormField label="Lugar" htmlFor="location" hint="Opcional">
        <Input id="location" name="location" placeholder="Ej: Patio, Sala 5° Básico, Baño…" />
      </FormField>

      <StudentMultiPicker students={students} value={selected} onChange={setSelected} />

      <FormField label="Tipo de situación" htmlFor="case_type_id" required>
        <Select id="case_type_id" name="case_type_id" required defaultValue="">
          <option value="" disabled>
            Selecciona…
          </option>
          {caseTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Descripción objetiva de los hechos" htmlFor="description" required hint="Solo hechos observables, sin juicios de valor.">
        <Textarea id="description" name="description" required rows={4} />
      </FormField>

      <FormField label="Personas presentes" htmlFor="people_present" hint="Opcional">
        <Textarea id="people_present" name="people_present" rows={2} />
      </FormField>

      <FormField label="Testigos" htmlFor="witnesses" hint="Opcional">
        <Textarea id="witnesses" name="witnesses" rows={2} />
      </FormField>

      <FormField label="Acción inmediata realizada" htmlFor="immediate_action" hint="Opcional">
        <Textarea id="immediate_action" name="immediate_action" rows={2} />
      </FormField>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={needsFollowup} onChange={(e) => setNeedsFollowup(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Necesita seguimiento
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={needsProtocol} onChange={(e) => setNeedsProtocol(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Necesita activar protocolo
        </label>
      </div>

      <FormField label="Observaciones" htmlFor="observations" hint="Opcional">
        <Textarea id="observations" name="observations" rows={2} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Registrar situación"}
      </Button>
    </form>
  );
}
