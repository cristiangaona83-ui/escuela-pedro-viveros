import { createClient } from "@/lib/supabase/server";
import type { GalleryRow } from "@/types/database";

export async function listGalleryAdmin(): Promise<GalleryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("gallery").select("*").order("order_index", { ascending: true }).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getGalleryItem(id: string): Promise<GalleryRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("gallery").select("*").eq("id", id).maybeSingle();
  return data;
}
