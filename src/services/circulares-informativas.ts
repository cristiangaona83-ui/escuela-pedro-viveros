import { createClient } from "@/lib/supabase/server";
import type { CircularInformativaRow } from "@/types/database";

export async function listCircularesInformativasAdmin(): Promise<CircularInformativaRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("circulares_informativas")
    .select("*")
    .order("display_order", { ascending: true })
    .order("circular_date", { ascending: false });
  return data ?? [];
}

export async function getCircularInformativaById(id: string): Promise<CircularInformativaRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("circulares_informativas").select("*").eq("id", id).maybeSingle();
  return data;
}
