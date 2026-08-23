import { createClient } from "@/lib/supabase/server";
import type { GuardianRow, GuardianContactRow } from "@/types/database";

export interface StudentGuardianFull {
  linkId: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  relationship: string | null;
  guardian: GuardianRow;
}

export interface StudentGuardianLimited {
  linkId: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  relationship: string | null;
  guardian: GuardianContactRow;
}

/** Apoderados vinculados a un estudiante, con todos los campos (incluye RUN).
 * Solo para roles con guardians_select_scope completo (director/utp/
 * administrativo/pie/convivencia/superadmin). */
export async function listStudentGuardiansFull(studentId: string): Promise<StudentGuardianFull[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_guardians")
    .select("id, is_primary, is_emergency_contact, relationship, guardians(id, full_name, run, phone, phone_alt, email, address, relationship, created_at)")
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false });

  type Row = {
    id: string;
    is_primary: boolean;
    is_emergency_contact: boolean;
    relationship: string | null;
    guardians: GuardianRow | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.guardians)
    .map((r) => ({
      linkId: r.id,
      isPrimary: r.is_primary,
      isEmergencyContact: r.is_emergency_contact,
      relationship: r.relationship,
      guardian: r.guardians!,
    }));
}

/** Apoderados vinculados a un estudiante, SIN RUN — para inspectoria_general.
 * Dos consultas separadas (ids del vínculo, luego datos vía la vista
 * guardian_contact_info) para que el RUN nunca pase por ninguna consulta,
 * ni siquiera una que luego se descarte en el cliente. */
export async function listStudentGuardiansLimited(studentId: string): Promise<StudentGuardianLimited[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("student_guardians")
    .select("id, guardian_id, is_primary, is_emergency_contact, relationship")
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false });

  if (!links || links.length === 0) return [];

  const { data: contacts } = await supabase
    .from("guardian_contact_info")
    .select("*")
    .in("id", links.map((l) => l.guardian_id));

  const byId = new Map((contacts ?? []).map((c) => [c.id, c]));
  return links
    .filter((l) => byId.has(l.guardian_id))
    .map((l) => ({
      linkId: l.id,
      isPrimary: l.is_primary,
      isEmergencyContact: l.is_emergency_contact,
      relationship: l.relationship,
      guardian: byId.get(l.guardian_id)!,
    }));
}

/** Busca un apoderado existente por RUN exacto (para evitar duplicados al
 * agregar uno nuevo desde el flujo con RUN visible). */
export async function findGuardianByRun(run: string): Promise<GuardianRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("guardians").select("*").eq("run", run).maybeSingle();
  return data;
}
