"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { RoleCode } from "@/types/database";

const RPC_ONLY_EDIT_ROLES: RoleCode[] = ["inspectoria_general", "convivencia"];

export function EnrollmentDetailsForm({
  enrollmentId,
  originSchool,
  originCourse,
  admissionCondition,
  notes,
  canWrite = true,
  roles = [],
}: {
  enrollmentId: string;
  originSchool: string | null;
  originCourse: string | null;
  admissionCondition: string | null;
  notes: string | null;
  canWrite?: boolean;
  roles?: RoleCode[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usesRpcEdit = roles.some((r) => RPC_ONLY_EDIT_ROLES.includes(r));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      origin_school: String(form.get("origin_school") || "").trim() || null,
      origin_course: String(form.get("origin_course") || "").trim() || null,
      admission_condition: String(form.get("admission_condition") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };

    const supabase = createClient();

    if (usesRpcEdit) {
      const { error: rpcError } = await supabase.rpc("update_enrollment_details", {
        p_enrollment_id: enrollmentId,
        p_origin_school: payload.origin_school ?? undefined,
        p_origin_course: payload.origin_course ?? undefined,
        p_admission_condition: payload.admission_condition ?? undefined,
        p_notes: payload.notes ?? undefined,
      });
      setLoading(false);
      if (rpcError) {
        setError(rpcError.message || "No pudimos guardar estos datos.");
        return;
      }
      router.refresh();
      return;
    }

    const { error: dbError } = await supabase.from("enrollments").update(payload).eq("id", enrollmentId);
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "update_enrollment_details",
        p_module: "estudiantes",
        p_entity: "enrollments",
        p_entity_id: enrollmentId,
        p_details: payload,
      });
    }
    setLoading(false);
    if (dbError) {
      setError("No pudimos guardar estos datos.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={!canWrite} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Establecimiento de procedencia" htmlFor="origin_school" hint="Cuando corresponda">
            <Input id="origin_school" name="origin_school" defaultValue={originSchool ?? undefined} />
          </FormField>
          <FormField label="Curso de procedencia" htmlFor="origin_course">
            <Input id="origin_course" name="origin_course" defaultValue={originCourse ?? undefined} />
          </FormField>
        </div>
        <FormField label="Condición de ingreso" htmlFor="admission_condition" hint="Ej: matrícula nueva, traslado, reincorporación">
          <Input id="admission_condition" name="admission_condition" defaultValue={admissionCondition ?? undefined} />
        </FormField>
        <FormField label="Observaciones de esta matrícula" htmlFor="notes" hint="Administrativas — nunca información de convivencia, PIE o salud">
          <Textarea id="notes" name="notes" defaultValue={notes ?? undefined} />
        </FormField>
      </fieldset>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {canWrite && (
        <Button type="submit" variant="secondary" size="sm" disabled={loading}>
          <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar datos de esta matrícula"}
        </Button>
      )}
    </form>
  );
}
