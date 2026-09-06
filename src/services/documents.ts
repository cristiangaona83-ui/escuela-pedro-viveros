import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/types/database";

export async function listDocuments(category?: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  let query = supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return data ?? [];
}

export async function listDocumentCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("category");
  const unique = Array.from(new Set((data ?? []).map((d) => d.category))).sort();
  return unique;
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  return data;
}
