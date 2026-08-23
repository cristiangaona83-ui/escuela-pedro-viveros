import { createClient } from "@/lib/supabase/server";
import type { PieRecordRow, RoleCode } from "@/types/database";

const SELECT_WITH_RELATIONS =
  "*, students(first_names, last_names), coordinator:profiles!pie_records_coordinator_id_fkey(full_name), professional:profiles!pie_records_professional_id_fkey(full_name)";

export interface PieRecordWithRelations extends PieRecordRow {
  students: { first_names: string; last_names: string } | null;
  coordinator: { full_name: string } | null;
  professional: { full_name: string } | null;
}

export async function listPieRecords(filters?: {
  status?: PieRecordRow["status"];
}): Promise<PieRecordWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("pie_records").select(SELECT_WITH_RELATIONS).order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data } = await query;
  return (data as unknown as PieRecordWithRelations[]) ?? [];
}

export async function getPieRecord(id: string): Promise<PieRecordWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("pie_records").select(SELECT_WITH_RELATIONS).eq("id", id).maybeSingle();
  return data as unknown as PieRecordWithRelations | null;
}

const PIE_TEAM_ROLES: RoleCode[] = ["pie", "educadora_diferencial", "psicopedagoga", "fonoaudiologa", "psicologo"];

/** Miembros del equipo PIE (coordinadora + profesionales), para asignar coordinador/profesional responsable. */
export async function listPieTeamOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("profiles(id, full_name), roles!inner(code)")
    .in("roles.code", PIE_TEAM_ROLES);
  return data ?? [];
}
