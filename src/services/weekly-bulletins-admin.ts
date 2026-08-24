import { createClient } from "@/lib/supabase/server";
import type { WeeklyBulletinRow } from "@/types/database";

export async function listBulletinsAdmin(): Promise<WeeklyBulletinRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_bulletins").select("*").order("number", { ascending: false });
  return data ?? [];
}

export async function getBulletinById(id: string): Promise<WeeklyBulletinRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_bulletins").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Sugerencia de número correlativo (último existente + 1) — editable por el usuario antes de guardar. */
export async function getNextBulletinNumber(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_bulletins")
    .select("number")
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.number ?? 0) + 1;
}

/** Resumen de envío por correo (cuántos destinatarios recibieron el informativo correctamente vs. fallaron). */
export async function getBulletinEmailSummary(bulletinId: string): Promise<{ sent: number; failed: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("bulletin_email_log").select("status").eq("bulletin_id", bulletinId);
  if (!data || data.length === 0) return null;
  return {
    sent: data.filter((r) => r.status === "sent").length,
    failed: data.filter((r) => r.status === "failed").length,
  };
}
