import { createClient } from "@/lib/supabase/server";
import type { ClassroomObservationRow } from "@/types/database";

const SELECT_WITH_RELATIONS =
  "*, courses(level, letter), subjects(name), teacher:profiles!classroom_observations_teacher_id_fkey(full_name), observer:profiles!classroom_observations_observer_id_fkey(full_name)";

export interface ObservationWithRelations extends ClassroomObservationRow {
  courses: { level: string; letter: string } | null;
  subjects: { name: string } | null;
  teacher: { full_name: string } | null;
  observer: { full_name: string } | null;
}

export async function listObservations(): Promise<ObservationWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classroom_observations")
    .select(SELECT_WITH_RELATIONS)
    .order("obs_date", { ascending: false });
  return (data as unknown as ObservationWithRelations[]) ?? [];
}

export async function getObservation(id: string): Promise<ObservationWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("classroom_observations").select(SELECT_WITH_RELATIONS).eq("id", id).maybeSingle();
  return data as unknown as ObservationWithRelations | null;
}
