import { createClient } from "@/lib/supabase/server";
import type { TestimonialRow, TestimonialStatus } from "@/types/database";

export interface TestimonialListItem extends TestimonialRow {
  reviewedByName: string | null;
}

export async function listTestimonialsAdmin(status?: TestimonialStatus): Promise<TestimonialListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("testimonials")
    .select("*, profiles!testimonials_reviewed_by_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data } = await query;
  type Row = TestimonialRow & { profiles: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const { profiles, ...rest } = r;
    return { ...rest, reviewedByName: profiles?.full_name ?? null };
  });
}

export async function countPendingTestimonials(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("testimonials")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente");
  return count ?? 0;
}
