import { NextResponse } from "next/server";
import { getFollowupList, getAttendanceThresholds, resolvePeriodFromSearchParams } from "@/services/attendance-analytics";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { SEMAFORO_LABEL } from "@/lib/attendance/calc";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;

function toCsv(rangeLabel: string, rows: Awaited<ReturnType<typeof getFollowupList>>) {
  const header = ["Estudiante", "Curso", "% Asistencia", "Ausencias", "Ausencias consecutivas", "Última presencia", "Estado"];
  const escape = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    `Estudiantes que requieren seguimiento - ${rangeLabel}`,
    header.map(escape).join(";"),
    ...rows.map((r) =>
      [r.fullName, r.courseLabel, r.rate !== null ? `${r.rate}%` : "", String(r.absences), String(r.consecutiveAbsences), r.lastPresence ?? "", SEMAFORO_LABEL[r.semaforo]]
        .map(escape)
        .join(";")
    ),
  ];
  return "﻿" + lines.join("\r\n");
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este listado" }, { status: 403 });
  }

  const { period, from, to, maxRate, minConsecutiveAbsences, mondayFridayOnly } = await request.json();
  const { range } = await resolvePeriodFromSearchParams({ period, from, to });
  const [courses, thresholds] = await Promise.all([getTeachableCourses(), getAttendanceThresholds()]);
  const courseIds = courses.map((c) => c.course_id);

  const rows = await getFollowupList(courseIds, range, thresholds, {
    maxRate: typeof maxRate === "number" ? maxRate : undefined,
    minConsecutiveAbsences: typeof minConsecutiveAbsences === "number" ? minConsecutiveAbsences : undefined,
    mondayFridayOnly: Boolean(mondayFridayOnly),
  });

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_seguimiento_asistencia_csv",
    p_module: "reportes",
    p_entity: "attendance",
    p_details: { period: range.label, date_from: range.from, date_to: range.to, student_count: rows.length },
  });

  return new NextResponse(toCsv(range.label, rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="seguimiento-asistencia.csv"` },
  });
}
