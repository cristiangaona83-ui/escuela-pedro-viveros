import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/types/database";

export interface EventWithCourse extends EventRow {
  courses: { level: string; letter: string } | null;
}

export async function listEvents(): Promise<EventWithCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, courses(level, letter)")
    .order("start_at", { ascending: true });
  return (data as unknown as EventWithCourse[]) ?? [];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return data;
}
