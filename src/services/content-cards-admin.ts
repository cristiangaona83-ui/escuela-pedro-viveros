import { createClient } from "@/lib/supabase/server";
import type { ContentCardRow, ContentCardSection } from "@/types/database";

export async function listContentCardsAdmin(section: ContentCardSection): Promise<ContentCardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_cards")
    .select("*")
    .eq("section", section)
    .order("order_index", { ascending: true });
  return data ?? [];
}
