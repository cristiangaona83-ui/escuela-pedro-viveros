import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/services/courses";

/**
 * Indicadores agregados para el dashboard "Áreas de Gestión" — nunca datos
 * individuales sensibles (diagnósticos PIE, notas de Convivencia, etc.),
 * solo conteos. Cada función reutiliza tablas ya existentes; RLS decide
 * igualmente qué puede ver quien las llama, esto solo evita repetir la
 * consulta en cada página.
 */

export interface UtpIndicators {
  activeCourses: number;
  evaluationsThisYear: number;
  plansPendingReview: number;
}

export async function getUtpIndicators(): Promise<UtpIndicators> {
  const supabase = await createClient();
  const year = await getActiveAcademicYear();

  const [{ count: activeCourses }, { count: evaluationsThisYear }, { count: plansPendingReview }] = await Promise.all([
    year
      ? supabase.from("courses").select("id", { count: "exact", head: true }).eq("academic_year_id", year.id).eq("active", true)
      : Promise.resolve({ count: 0 }),
    year
      ? supabase
          .from("evaluations")
          .select("id, academic_periods!inner(academic_year_id)", { count: "exact", head: true })
          .eq("academic_periods.academic_year_id", year.id)
      : Promise.resolve({ count: 0 }),
    supabase.from("lesson_plans").select("id", { count: "exact", head: true }).eq("status", "enviada"),
  ]);

  return {
    activeCourses: activeCourses ?? 0,
    evaluationsThisYear: evaluationsThisYear ?? 0,
    plansPendingReview: plansPendingReview ?? 0,
  };
}

export interface InspectoriaIndicators {
  attendanceToday: number;
  lateToday: number;
  activePickupAuthorizations: number;
}

export async function getInspectoriaIndicators(): Promise<InspectoriaIndicators> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: attendanceToday }, { count: lateToday }, { count: activePickupAuthorizations }] = await Promise.all([
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today),
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "atraso"),
    supabase.from("student_pickup_authorizations").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  return {
    attendanceToday: attendanceToday ?? 0,
    lateToday: lateToday ?? 0,
    activePickupAuthorizations: activePickupAuthorizations ?? 0,
  };
}

export interface PieIndicators {
  activeCases: number;
  studentsSupported: number;
}

export async function getPieIndicators(): Promise<PieIndicators> {
  const supabase = await createClient();
  const [{ count: activeCases }, { data: studentRows }] = await Promise.all([
    supabase.from("pie_records").select("id", { count: "exact", head: true }).eq("status", "activo"),
    supabase.from("pie_records").select("student_id").eq("status", "activo"),
  ]);

  const studentsSupported = new Set((studentRows ?? []).map((r) => r.student_id)).size;

  return { activeCases: activeCases ?? 0, studentsSupported };
}
