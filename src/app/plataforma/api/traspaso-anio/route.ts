import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getRolloverPlan, type RolloverDecision } from "@/services/year-rollover";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;
const DECISIONS: RolloverDecision[] = ["promover", "repetir", "no_continua"];

/**
 * Traspaso de un año académico al siguiente: crea los cursos del año destino,
 * copia (opcional) jefaturas y carga docente, matricula a cada estudiante en el
 * curso que le corresponde y marca como egresados a quienes terminan 8° Básico
 * (opcional). El plan se recalcula acá, desde la base -- del navegador solo se
 * toman las decisiones por estudiante (promueve / repite / no continúa) y las
 * opciones --, y la escritura es una sola función SQL (transacción), que se
 * puede volver a ejecutar sin duplicar nada.
 *
 * Body: { fromYearId, toYearId, decisions: { [studentId]: decision },
 *         copyHomeroom, copyAssignments, graduate }
 */
export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para traspasar el año" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const fromYearId = typeof body?.fromYearId === "string" ? body.fromYearId : null;
  const toYearId = typeof body?.toYearId === "string" ? body.toYearId : null;
  if (!fromYearId || !toYearId || fromYearId === toYearId) {
    return NextResponse.json({ error: "Elige un año de origen y uno de destino distintos" }, { status: 400 });
  }
  const decisions: Record<string, unknown> = body?.decisions && typeof body.decisions === "object" ? body.decisions : {};

  const plan = await getRolloverPlan(fromYearId, toYearId);
  if (plan.courses.length === 0) {
    return NextResponse.json({ error: "El año de origen no tiene cursos activos" }, { status: 400 });
  }

  const courses = new Map<string, { level: string; letter: string }>();
  const enrollments: { student_id: string; level: string; letter: string }[] = [];
  const graduates: string[] = [];

  for (const c of plan.courses) {
    // Todo curso del origen existe también en el destino (repitentes, ingresos nuevos...).
    courses.set(`${c.level}|${c.letter}`, { level: c.level, letter: c.letter });
    if (c.nextLevel) courses.set(`${c.nextLevel}|${c.letter}`, { level: c.nextLevel, letter: c.letter });

    for (const s of c.students) {
      const raw = decisions[s.studentId];
      const decision = DECISIONS.includes(raw as RolloverDecision) ? (raw as RolloverDecision) : s.defaultDecision;
      if (decision === "repetir") {
        enrollments.push({ student_id: s.studentId, level: c.level, letter: c.letter });
      } else if (decision === "promover") {
        if (c.nextLevel) enrollments.push({ student_id: s.studentId, level: c.nextLevel, letter: c.letter });
        else if (c.kind === "egresa" && body?.graduate !== false) graduates.push(s.studentId);
      }
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rollover_academic_year", {
    p_from_year: fromYearId,
    p_to_year: toYearId,
    p_courses: [...courses.values()],
    p_enrollments: enrollments,
    p_graduates: graduates,
    p_copy_homeroom: body?.copyHomeroom !== false,
    p_copy_assignments: body?.copyAssignments !== false,
  });
  if (error) {
    console.error("[traspaso-anio] error", { message: error.message, details: error.details, hint: error.hint });
    return NextResponse.json({ error: "No se pudo realizar el traspaso. No se aplicó ningún cambio." }, { status: 500 });
  }

  return NextResponse.json({ summary: data });
}
