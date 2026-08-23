"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentRow, RoleCode } from "@/types/database";

// Mismo criterio que StudentForm/update_student_fields: estos dos roles
// nunca tienen UPDATE directo sobre students, solo el RPC acotado nuevo.
const RPC_ONLY_EDIT_ROLES: RoleCode[] = ["inspectoria_general", "convivencia"];

export function StudentIdentityForm({
  student,
  canWrite = true,
  roles = [],
}: {
  student: StudentRow;
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
      nationality: String(form.get("nationality") || "").trim() || null,
      birth_country: String(form.get("birth_country") || "").trim() || null,
      sex: (String(form.get("sex") || "").trim() || null) as "M" | "F" | null,
      personal_phone: String(form.get("personal_phone") || "").trim() || null,
      personal_email: String(form.get("personal_email") || "").trim() || null,
      address_street: String(form.get("address_street") || "").trim() || null,
      address_number: String(form.get("address_number") || "").trim() || null,
      address_sector: String(form.get("address_sector") || "").trim() || null,
      address_commune: String(form.get("address_commune") || "").trim() || null,
      address_region: String(form.get("address_region") || "").trim() || null,
    };

    const supabase = createClient();

    if (usesRpcEdit) {
      const { error: rpcError } = await supabase.rpc("update_student_identity_extra", {
        p_student_id: student.id,
        p_nationality: payload.nationality ?? undefined,
        p_birth_country: payload.birth_country ?? undefined,
        p_sex: payload.sex ?? undefined,
        p_personal_phone: payload.personal_phone ?? undefined,
        p_personal_email: payload.personal_email ?? undefined,
        p_address_street: payload.address_street ?? undefined,
        p_address_number: payload.address_number ?? undefined,
        p_address_sector: payload.address_sector ?? undefined,
        p_address_commune: payload.address_commune ?? undefined,
        p_address_region: payload.address_region ?? undefined,
      });
      setLoading(false);
      if (rpcError) {
        setError(rpcError.message || "No pudimos guardar estos datos.");
        return;
      }
      router.refresh();
      return;
    }

    const { error: dbError } = await supabase.from("students").update(payload).eq("id", student.id);
    if (!dbError) {
      await supabase.rpc("log_audit", {
        p_action: "update_student_identity_extra",
        p_module: "estudiantes",
        p_entity: "students",
        p_entity_id: student.id,
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
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Nacionalidad" htmlFor="nationality">
            <Input id="nationality" name="nationality" defaultValue={student.nationality ?? undefined} />
          </FormField>
          <FormField label="País de nacimiento" htmlFor="birth_country">
            <Input id="birth_country" name="birth_country" defaultValue={student.birth_country ?? undefined} />
          </FormField>
          <FormField label="Sexo registral" htmlFor="sex" hint="Registro Civil — uso administrativo">
            <Select id="sex" name="sex" defaultValue={student.sex ?? ""}>
              <option value="">Sin registrar</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Teléfono personal" htmlFor="personal_phone" hint="Del estudiante, cuando corresponda">
            <Input id="personal_phone" name="personal_phone" defaultValue={student.personal_phone ?? undefined} />
          </FormField>
          <FormField label="Correo personal" htmlFor="personal_email">
            <Input id="personal_email" name="personal_email" type="email" defaultValue={student.personal_email ?? undefined} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Domicilio (calle)" htmlFor="address_street">
            <Input id="address_street" name="address_street" defaultValue={student.address_street ?? undefined} />
          </FormField>
          <FormField label="Número / depto." htmlFor="address_number">
            <Input id="address_number" name="address_number" defaultValue={student.address_number ?? undefined} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Sector / localidad" htmlFor="address_sector">
            <Input id="address_sector" name="address_sector" defaultValue={student.address_sector ?? undefined} />
          </FormField>
          <FormField label="Comuna" htmlFor="address_commune">
            <Input id="address_commune" name="address_commune" defaultValue={student.address_commune ?? undefined} />
          </FormField>
          <FormField label="Región" htmlFor="address_region">
            <Input id="address_region" name="address_region" defaultValue={student.address_region ?? undefined} />
          </FormField>
        </div>
      </fieldset>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {canWrite && (
        <Button type="submit" variant="secondary" size="sm" disabled={loading}>
          <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar identificación y domicilio"}
        </Button>
      )}
    </form>
  );
}
