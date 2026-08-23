"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentRow, RoleCode } from "@/types/database";

// Estos dos roles nunca reciben UPDATE directo sobre students (RLS no se lo
// permite) — su única vía de edición es el RPC acotado update_student_fields,
// que nunca toca status (los cambios de estado van por matricular/retirar/
// reactivar). director/utp/administrativo/superadmin conservan su UPDATE
// directo de siempre, sin cambios.
const RPC_ONLY_EDIT_ROLES: RoleCode[] = ["inspectoria_general", "convivencia"];

export function StudentForm({
  student,
  canWrite = true,
  roles = [],
}: {
  student?: StudentRow;
  canWrite?: boolean;
  roles?: RoleCode[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(student);
  const usesRpcEdit = isEdit && roles.some((r) => RPC_ONLY_EDIT_ROLES.includes(r));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      first_names: String(form.get("first_names") || "").trim(),
      last_names: String(form.get("last_names") || "").trim(),
      run: String(form.get("run") || "").trim(),
      birth_date: String(form.get("birth_date") || "") || null,
      status: String(form.get("status") || "matriculado") as StudentRow["status"],
      notes: String(form.get("notes") || "") || null,
    };

    const supabase = createClient();

    if (usesRpcEdit) {
      const { error: rpcError } = await supabase.rpc("update_student_fields", {
        p_student_id: student!.id,
        p_first_names: payload.first_names,
        p_last_names: payload.last_names,
        p_run: payload.run,
        p_birth_date: payload.birth_date,
        p_notes: payload.notes ?? undefined,
      });
      setLoading(false);
      if (rpcError) {
        setError(rpcError.message || "No pudimos guardar el estudiante.");
        return;
      }
      router.push(`/plataforma/estudiantes/${student!.id}`);
      router.refresh();
      return;
    }

    const { data, error: dbError } = student
      ? await supabase.from("students").update(payload).eq("id", student.id).select("id").single()
      : await supabase.from("students").insert(payload).select("id").single();

    setLoading(false);
    if (dbError) {
      setError(
        dbError.code === "23505"
          ? "Ya existe un estudiante registrado con ese RUN."
          : "No pudimos guardar el estudiante. Verifica los datos."
      );
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: student ? "actualizar_estudiante" : "crear_estudiante",
      p_module: "estudiantes",
      p_entity: "students",
      p_entity_id: data.id,
      p_details: student
        ? {
            before: {
              first_names: student.first_names,
              last_names: student.last_names,
              run: student.run,
              birth_date: student.birth_date,
              status: student.status,
              notes: student.notes,
            },
            after: payload,
          }
        : { after: payload },
    });

    router.push(`/plataforma/estudiantes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!canWrite && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <Lock className="h-4 w-4 shrink-0" /> Solo lectura: tu rol puede consultar esta ficha, pero no editarla.
        </div>
      )}
      <fieldset disabled={!canWrite} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombres" htmlFor="first_names" required>
            <Input id="first_names" name="first_names" defaultValue={student?.first_names} required />
          </FormField>
          <FormField label="Apellidos" htmlFor="last_names" required>
            <Input id="last_names" name="last_names" defaultValue={student?.last_names} required />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="RUN" htmlFor="run" required hint="Formato: 12345678-9">
            <Input id="run" name="run" defaultValue={student?.run} required />
          </FormField>
          <FormField label="Fecha de nacimiento" htmlFor="birth_date">
            <Input id="birth_date" name="birth_date" type="date" defaultValue={student?.birth_date ?? undefined} />
          </FormField>
        </div>
        <FormField
          label="Estado de matrícula"
          htmlFor="status"
          required
          hint={usesRpcEdit ? "Usa \"Retirar\", \"Matricular\" o \"Reactivar\" para cambiar el estado." : undefined}
        >
          <Select id="status" name="status" defaultValue={student?.status ?? "matriculado"} disabled={usesRpcEdit}>
            <option value="matriculado">Matriculado</option>
            <option value="retirado">Retirado</option>
            <option value="egresado">Egresado</option>
          </Select>
        </FormField>
        <FormField label="Observaciones administrativas" htmlFor="notes" hint="Opcional">
          <Input id="notes" name="notes" defaultValue={student?.notes ?? undefined} />
        </FormField>
      </fieldset>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {canWrite && (
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar estudiante"}
        </Button>
      )}
    </form>
  );
}
