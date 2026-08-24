import { createClient } from "@/lib/supabase/server";
import type { BulletinRecipientRow } from "@/types/database";

export async function listRecipients(): Promise<BulletinRecipientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("bulletin_recipients").select("*").order("full_name", { ascending: true });
  return data ?? [];
}

export async function getRecipientById(id: string): Promise<BulletinRecipientRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("bulletin_recipients").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getActiveRecipientCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("bulletin_recipients")
    .select("*", { count: "exact", head: true })
    .eq("active", true)
    .eq("is_primary", true);
  return count ?? 0;
}
