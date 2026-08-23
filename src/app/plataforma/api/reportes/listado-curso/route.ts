import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CourseRosterDocument } from "@/lib/pdf/CourseRosterDocument";
import { getCourseRoster, type CourseRosterStudent } from "@/services/course-roster";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia", "docente"] as const;
const BROAD_ACCESS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

const STATUS_LABEL: Record<string, string> = { activa: "Matriculado", retirada: "Retirado", trasladada: "Trasladado" };

function toCsv(courseLabel: string, academicYear: number, students: CourseRosterStudent[]) {
  const header = ["N°", "Nombre completo", "RUN", "Fecha de nacimiento", "Estado"];
  const rows = students.map((s, i) => [
    String(i + 1),
    `${s.last_names}, ${s.first_names}`,
    s.run,
    s.birth_date ? formatDate(s.birth_date) : "",
    STATUS_LABEL[s.enrollment_status] ?? s.enrollment_status,
  ]);
  const escape = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    `Listado de estudiantes - ${courseLabel} - ${academicYear}`,
    header.map(escape).join(";"),
    ...rows.map((r) => r.map(escape).join(";")),
  ];
  return "﻿" + lines.join("\r\n");
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este listado" }, { status: 403 });
  }

  const { course_id, format } = await request.json();
  if (!course_id || (format !== "pdf" && format !== "csv")) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Defensa en profundidad: no confiar únicamente en RLS. Para roles sin
  // acceso amplio (docente), el curso solicitado debe estar explícitamente
  // entre los que getTeachableCourses() ya le reconoce (jefatura o
  // teacher_assignments) antes de generar nada.
  if (!canWrite(session.roles, [...BROAD_ACCESS_ROLES])) {
    const teachable = await getTeachableCourses();
    if (!teachable.some((c) => c.course_id === course_id)) {
      return NextResponse.json({ error: "No tienes acceso a ese curso" }, { status: 403 });
    }
  }

  const roster = await getCourseRoster(course_id);
  if (!roster) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: `generar_listado_curso_${format}`,
    p_module: "estudiantes",
    p_entity: "courses",
    p_entity_id: course_id,
    p_details: { course_label: roster.courseLabel, academic_year: roster.academicYear, student_count: roster.students.length },
  });

  if (format === "csv") {
    const csv = toCsv(roster.courseLabel, roster.academicYear, roster.students);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listado-${course_id}.csv"`,
      },
    });
  }

  const buffer = await renderToBuffer(
    CourseRosterDocument({
      courseLabel: roster.courseLabel,
      academicYear: roster.academicYear,
      students: roster.students,
      issuedAt: new Date().toISOString(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="listado-${course_id}.pdf"`,
    },
  });
}
