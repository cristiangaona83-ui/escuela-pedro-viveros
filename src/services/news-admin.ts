import { createClient } from "@/lib/supabase/server";
import type { NewsRow } from "@/types/database";

export interface NewsWithAuthor extends NewsRow {
  author: { full_name: string } | null;
}

export async function listNewsAdmin(): Promise<NewsWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select("*, author:profiles!news_author_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  return (data as unknown as NewsWithAuthor[]) ?? [];
}

export async function getNewsById(id: string): Promise<NewsRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
  return data;
}
