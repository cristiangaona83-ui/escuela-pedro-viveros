import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { MatriculaFichaDocument } from "@/lib/pdf/MatriculaFichaDocument";
import { blankFichaData, getMatriculaFichaData } from "@/services/matricula-ficha";
import { getActiveAcademicYear } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

// Mismo alcance que la ficha integral del estudiante: incluye domicilio, apoderados y retiro.
const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;

/**
 * Ficha de matrícula en PDF (formato de Inspectoría General, 3 páginas).
 *  - GET ?blank=1                    ficha en blanco para completar a mano.
 *  - GET ?student_id=...&year=<id>   ficha con lo registrado para ese estudiante y año.
 */
export async function GET(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir esta ficha" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get("blank")) {
    const year = await getActiveAcademicYear();
    const buffer = await renderToBuffer(MatriculaFichaDocument({ data: blankFichaData(year ? String(year.year) : "") }));
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="ficha-matricula-en-blanco.pdf"', "Cache-Control": "no-store" },
    });
  }

  const studentId = searchParams.get("student_id");
  const yearId = searchParams.get("year") ?? (await getActiveAcademicYear())?.id;
  if (!studentId || !yearId) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  // Inspectoría General no ve el RUN de los apoderados.
  const limited = session.roles.includes("inspectoria_general") && !session.roles.some((r) => ["director", "utp", "administrativo", "superadmin"].includes(r));
  const data = await getMatriculaFichaData(studentId, yearId, limited);
  if (!data) return NextResponse.json({ error: "El estudiante no tiene matrícula en ese año" }, { status: 404 });

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_ficha_matricula",
    p_module: "matricula",
    p_entity: "students",
    p_entity_id: studentId,
    p_details: { year: data.yearLabel },
  });

  const buffer = await renderToBuffer(MatriculaFichaDocument({ data }));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-matricula-${slugify(`${data.form.first_names} ${data.form.paternal_last_name}`)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
