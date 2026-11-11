import { createClient } from "@/lib/supabase/server";
import { LAST_LEVEL, levelSortIndex, nextLevel } from "@/lib/course-levels";

/** Qué pasa con un estudiante en el traspaso. */
export type RolloverDecision = "promover" | "repetir" | "no_continua";

export interface RolloverStudent {
  studentId: string;
  name: string;
  run: string;
  /** Ya tiene matrícula en el año destino: el traspaso lo omite. */
  alreadyEnrolled: boolean;
  /** Decisión sugerida: todos promueven, salvo quienes ya no tienen estado de matriculado. */
  defaultDecision: RolloverDecision;
}

export interface RolloverCourse {
  courseId: string;
  level: string;
  letter: string;
  label: string;
  /** Curso al que pasan quienes promueven; null si egresan o el nivel no es reconocido. */
  nextLevel: string | null;
  destLabel: string | null;
  kind: "promueve" | "egresa" | "sin_siguiente";
  students: RolloverStudent[];
}

export interface RolloverPlan {
  courses: RolloverCourse[];
  /** Cursos y matrículas que el año destino ya tiene (para avisar si no está vacío). */
  targetCourseCount: number;
  targetEnrollmentCount: number;
}

/**
 * Plan de traspaso de un año a otro: cada curso del año origen con sus
 * estudiantes de matrícula activa y el curso al que pasarían. Solo lectura --
 * lo que se ejecuta (y se vuelve a calcular en el servidor) es la ruta
 * /plataforma/api/traspaso-anio.
 */
export async function getRolloverPlan(fromYearId: string, toYearId: string): Promise<RolloverPlan> {
  const supabase = await createClient();
  const [{ data: courses }, { data: enrollments }, { data: targetEnrollments }, { count: targetCourseCount }] = await Promise.all([
    supabase.from("courses").select("id, level, letter").eq("academic_year_id", fromYearId).eq("active", true),
    supabase
      .from("enrollments")
      .select("course_id, student_id, students(id, first_names, last_names, run, status)")
      .eq("academic_year_id", fromYearId)
      .eq("status", "activa"),
    supabase.from("enrollments").select("student_id").eq("academic_year_id", toYearId),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("academic_year_id", toYearId),
  ]);

  type EnrollmentRow = {
    course_id: string;
    student_id: string;
    students: { id: string; first_names: string; last_names: string; run: string; status: string } | null;
  };
  const inTarget = new Set((targetEnrollments ?? []).map((e) => e.student_id));
  const byCourse = new Map<string, RolloverStudent[]>();
  for (const e of (enrollments ?? []) as unknown as EnrollmentRow[]) {
    if (!e.students) continue;
    const list = byCourse.get(e.course_id) ?? [];
    list.push({
      studentId: e.students.id,
      name: `${e.students.last_names}, ${e.students.first_names}`,
      run: e.students.run,
      alreadyEnrolled: inTarget.has(e.students.id),
      defaultDecision: e.students.status === "matriculado" ? "promover" : "no_continua",
    });
    byCourse.set(e.course_id, list);
  }

  const plan: RolloverCourse[] = (courses ?? [])
    .map((c) => {
      const next = nextLevel(c.level);
      const kind: RolloverCourse["kind"] = next ? "promueve" : c.level === LAST_LEVEL ? "egresa" : "sin_siguiente";
      return {
        courseId: c.id,
        level: c.level,
        letter: c.letter,
        label: c.letter ? `${c.level} ${c.letter}` : c.level,
        nextLevel: next,
        destLabel: next ? (c.letter ? `${next} ${c.letter}` : next) : null,
        kind,
        students: (byCourse.get(c.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "es")),
      };
    })
    .sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter, "es"));

  return { courses: plan, targetCourseCount: targetCourseCount ?? 0, targetEnrollmentCount: targetEnrollments?.length ?? 0 };
}
