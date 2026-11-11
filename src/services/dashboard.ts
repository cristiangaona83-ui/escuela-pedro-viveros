import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/services/courses";

export interface DashboardCounts {
  students: number;
  courses: number;
  evaluations: number;
  pendingGrades: number;
  certificates: number;
}

async function safeCount(fn: () => Promise<{ count: number | null }>) {
  try {
    const { count } = await fn();
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const supabase = await createClient();
  const year = await getActiveAcademicYear();

  const [students, courses, evaluations, certificates] = await Promise.all([
    safeCount(async () => supabase.from("students").select("id", { count: "exact", head: true }).eq("active", true)),
    safeCount(async () => (year ? supabase.from("courses").select("id", { count: "exact", head: true }).eq("active", true).eq("academic_year_id", year.id) : supabase.from("courses").select("id", { count: "exact", head: true }).eq("active", true))),
    safeCount(async () => supabase.from("evaluations").select("id", { count: "exact", head: true })),
    safeCount(async () => supabase.from("certificates").select("id", { count: "exact", head: true })),
  ]);

  return { students, courses, evaluations, pendingGrades: 0, certificates };
}
