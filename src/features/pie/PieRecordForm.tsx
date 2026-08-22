"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { PieRecordWithRelations } from "@/services/pie-records";
import type { PieRecordRow } from "@/types/database";

interface StudentOption {
  id: string;
  label: string;
}
interface ProfessionalOption {
  id: string;
  full_name: string;
}

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "en_evaluacion", label: "En evaluación" },
  { value: "egresado", label: "Egresado" },
];

export function PieRecordForm({
  record,
  studentOptions,
  professionalOptions,
}: {
  record?: PieRecordWithRelations;
  studentOptions: StudentOption[];
  professionalOptions: ProfessionalOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(record);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const payload = {
      student_id: String(form.get("student_id") || ""),
      coordinator_id: String(form.get("coordinator_id") || "") || null,
      professional_id: String(form.get("professional_id") || "") || null,
      support_type: String(form.get("support_type") || "").trim() || null,
      diagnosis: String(form.get("diagnosis") || "").trim() || null,
      actions: String(form.get("actions") || "").trim() || null,
      follow_up: String(form.get("follow_up") || "").trim() || null,
      observations: String(form.get("observations") || "").trim() || null,
      status: String(form.get("status") || "activo") as PieRecordRow["status"],
    };

    const { error: dbError } = isEdit
      ? await supabase.from("pie_records").update(payload).eq("id", record!.id)
      : await supabase.from("pie_records").insert(payload);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar el registro PIE.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_pie" : "crear_pie",
      p_module: "pie",
      p_entity: "pie_records",
      p_entity_id: record?.id,
      p_details: { student_id: payload.student_id, status: payload.status },
    });

    setLoading(false);
    if (isEdit) {
      router.push("/plataforma/pie");
    } else {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Estudiante" htmlFor="student_id" required>
        <Select id="student_id" name="student_id" required disabled={isEdit} defaultValue={record?.student_id}>
          <option value="">Selecciona…</option>
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Coordinador PIE" htmlFor="coordinator_id" hint="Opcional">
          <Select id="coordinator_id" name="coordinator_id" defaultValue={record?.coordinator_id ?? ""}>
            <option value="">Sin asignar</option>
            {professionalOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Profesional responsable" htmlFor="professional_id" hint="Opcional">
          <Select id="professional_id" name="professional_id" defaultValue={record?.professional_id ?? ""}>
            <option value="">Sin asignar</option>
            {professionalOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Tipo de apoyo" htmlFor="support_type" hint="Ej: PIE - NEE transitoria, PIE - NEE permanente">
        <Input id="support_type" name="support_type" defaultValue={record?.support_type ?? undefined} />
      </FormField>
      <FormField label="Diagnóstico" htmlFor="diagnosis" hint="Información sensible — visible solo para el equipo PIE, UTP y Dirección.">
        <Textarea id="diagnosis" name="diagnosis" defaultValue={record?.diagnosis ?? undefined} />
      </FormField>
      <FormField label="Acciones realizadas" htmlFor="actions">
        <Textarea id="actions" name="actions" defaultValue={record?.actions ?? undefined} />
      </FormField>
      <FormField label="Seguimiento" htmlFor="follow_up">
        <Textarea id="follow_up" name="follow_up" defaultValue={record?.follow_up ?? undefined} />
      </FormField>
      <FormField label="Observaciones" htmlFor="observations" hint="Opcional">
        <Textarea id="observations" name="observations" defaultValue={record?.observations ?? undefined} />
      </FormField>
      <FormField label="Estado" htmlFor="status" required>
        <Select id="status" name="status" required defaultValue={record?.status ?? "activo"}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar en PIE"}
      </Button>
    </form>
  );
}
