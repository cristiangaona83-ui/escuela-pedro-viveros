import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ConvivenciaInterviewActaDocument } from "@/lib/pdf/ConvivenciaInterviewActaDocument";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { INTERVIEW_PARTICIPANT_LABELS } from "@/features/convivencia/labels";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "superadmin", "convivencia", "inspectoria_general"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar esta acta" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // La consulta ya respeta RLS: si es inspectoria_general y el caso no está
  // asignado a su usuario, esto no devuelve nada (defensa en profundidad,
  // no solo ocultar el botón en la UI).
  const { data: interview } = await supabase
    .from("convivencia_interviews")
    .select(
      "*, responsible:profiles!convivencia_interviews_responsible_id_fkey(full_name), student:students(first_names,last_names), guardian:guardians(full_name), case:convivencia_cases(folio)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!interview) return NextResponse.json({ error: "Entrevista no encontrada" }, { status: 404 });

  type Row = typeof interview & {
    responsible: { full_name: string } | null;
    student: { first_names: string; last_names: string } | null;
    guardian: { full_name: string } | null;
    case: { folio: string } | null;
  };
  const row = interview as unknown as Row;

  const participantName = row.student ? `${row.student.last_names}, ${row.student.first_names}` : row.guardian?.full_name ?? row.participant_other ?? "—";
  const participantLabel = `${INTERVIEW_PARTICIPANT_LABELS[row.participant_type] ?? row.participant_type} — ${participantName}`;

  await supabase.rpc("log_audit", {
    p_action: "generar_acta_entrevista",
    p_module: "convivencia",
    p_entity: "convivencia_interviews",
    p_entity_id: id,
    p_details: { case_folio: row.case?.folio ?? null },
  });

  const buffer = await renderToBuffer(
    ConvivenciaInterviewActaDocument({
      caseFolio: row.case?.folio ?? "—",
      interviewDate: row.interview_date,
      interviewTime: row.interview_time,
      participantLabel,
      reason: row.reason,
      summary: row.summary,
      agreements: row.agreements,
      commitments: row.commitments,
      followupDate: row.followup_date,
      responsibleName: row.responsible?.full_name ?? "—",
      issuedAt: new Date().toISOString(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="acta-entrevista-${id}.pdf"`,
    },
  });
}
