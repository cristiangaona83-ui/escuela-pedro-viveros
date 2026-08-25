"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentName } from "@/services/convivencia";
import type { ConvivenciaInterviewParticipantType } from "@/types/database";

export interface GuardianOption {
  id: string;
  full_name: string;
  studentLabel: string;
}

/** Registro de entrevista (punto 9). Crea también el evento correspondiente
 * en la línea de tiempo del caso. */
export function InterviewForm({ caseId, students, guardians }: { caseId: string; students: StudentName[]; guardians: GuardianOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [participantType, setParticipantType] = useState("estudiante");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
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
      case_id: caseId,
      interview_date: String(form.get("interview_date") || ""),
      interview_time: String(form.get("interview_time") || "") || null,
      participant_type: participantType as ConvivenciaInterviewParticipantType,
      participant_student_id: participantType === "estudiante" ? String(form.get("participant_student_id") || "") || null : null,
      participant_guardian_id: participantType === "apoderado" ? String(form.get("participant_guardian_id") || "") || null : null,
      participant_other: participantType === "funcionario" || participantType === "otro" ? String(form.get("participant_other") || "").trim() || null : null,
      reason: String(form.get("reason") || "").trim() || null,
      summary: String(form.get("summary") || "").trim() || null,
      agreements: String(form.get("agreements") || "").trim() || null,
      commitments: String(form.get("commitments") || "").trim() || null,
      followup_date: String(form.get("followup_date") || "") || null,
      responsible_id: user.id,
      created_by: user.id,
    };
    if (!payload.interview_date) {
      setLoading(false);
      setError("Ingresa la fecha.");
      return;
    }

    const { error: insertError } = await supabase.from("convivencia_interviews").insert(payload);
    if (insertError) {
      setLoading(false);
      setError("No pudimos registrar la entrevista.");
      return;
    }

    await supabase.from("convivencia_events").insert({
      case_id: caseId,
      event_date: payload.interview_date,
      event_time: payload.interview_time,
      event_type: "entrevista",
      observation: payload.reason ?? "Entrevista registrada.",
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "agregar_entrevista",
      p_module: "convivencia",
      p_entity: "convivencia_interviews",
      p_entity_id: caseId,
      p_details: { participant_type: participantType },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Registrar entrevista
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Fecha" htmlFor="interview_date" required>
          <Input id="interview_date" name="interview_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Hora" htmlFor="interview_time" hint="Opcional">
          <Input id="interview_time" name="interview_time" type="time" />
        </FormField>
        <FormField label="Participante" htmlFor="participant_type" required>
          <Select id="participant_type" name="participant_type" value={participantType} onChange={(e) => setParticipantType(e.target.value)}>
            <option value="estudiante">Estudiante</option>
            <option value="apoderado">Apoderado</option>
            <option value="funcionario">Funcionario</option>
            <option value="otro">Otro</option>
          </Select>
        </FormField>
      </div>

      {participantType === "estudiante" && (
        <FormField label="Estudiante" htmlFor="participant_student_id" required>
          <Select id="participant_student_id" name="participant_student_id" required defaultValue="">
            <option value="" disabled>
              Selecciona…
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.last_names}, {s.first_names}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {participantType === "apoderado" && (
        <FormField label="Apoderado" htmlFor="participant_guardian_id" required>
          <Select id="participant_guardian_id" name="participant_guardian_id" required defaultValue="">
            <option value="" disabled>
              Selecciona…
            </option>
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name} ({g.studentLabel})
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {(participantType === "funcionario" || participantType === "otro") && (
        <FormField label="Nombre" htmlFor="participant_other" required>
          <Input id="participant_other" name="participant_other" required />
        </FormField>
      )}

      <FormField label="Motivo" htmlFor="reason">
        <Textarea id="reason" name="reason" rows={2} />
      </FormField>
      <FormField label="Síntesis" htmlFor="summary">
        <Textarea id="summary" name="summary" rows={3} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Acuerdos" htmlFor="agreements">
          <Textarea id="agreements" name="agreements" rows={2} />
        </FormField>
        <FormField label="Compromisos" htmlFor="commitments">
          <Textarea id="commitments" name="commitments" rows={2} />
        </FormField>
      </div>
      <FormField label="Próxima revisión" htmlFor="followup_date" hint="Opcional">
        <Input id="followup_date" name="followup_date" type="date" />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : "Guardar entrevista"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
