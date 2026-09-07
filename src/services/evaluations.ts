import { createClient } from "@/lib/supabase/server";

/**
 * Conteo de evaluaciones por curso/asignatura para las vistas de carpetas de
 * /plataforma/evaluaciones -- una sola consulta liviana (solo IDs), acotada
 * automáticamente por RLS (`evaluations_select_scope`: el propio docente ve
 * solo sus evaluaciones, dirección/UTP/superadmin ven todas). No se agrega
 * ninguna política nueva: se reutiliza exactamente el mismo alcance que ya
 * usaba /plataforma/evaluaciones antes de esta reorganización.
 */
export async function listEvaluationScopeCounts(courseId?: string): Promise<{ course_id: string; subject_id: string }[]> {
  const supabase = await createClient();
  let query = supabase.from("evaluations").select("course_id, subject_id");
  if (courseId) query = query.eq("course_id", courseId);
  const { data } = await query;
  return data ?? [];
}
