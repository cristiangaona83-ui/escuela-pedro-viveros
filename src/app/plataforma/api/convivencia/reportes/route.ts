import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ConvivenciaReportDocument } from "@/lib/pdf/ConvivenciaReportDocument";
import { listCases, listFollowups, listPreventiveActions, listManagementPlan } from "@/services/convivencia";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { formatDate } from "@/lib/utils";
import { CASE_STATUS_LABELS, PLAN_STATUS_LABELS } from "@/features/convivencia/labels";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "superadmin", "convivencia", "inspectoria_general"] as const;

type ReportType =
  | "resumen_mensual"
  | "casos_abiertos"
  | "casos_por_curso"
  | "casos_por_tipo"
  | "seguimientos_pendientes"
  | "acciones_preventivas"
  | "avance_plan";

async function buildReport(reportType: ReportType, academicYearId?: string) {
  switch (reportType) {
    case "resumen_mensual":
    case "casos_abiertos": {
      const cases = await listCases({ academicYearId });
      const filtered = reportType === "casos_abiertos" ? cases.filter((c) => c.status !== "cerrado") : cases;
      return {
        title: reportType === "casos_abiertos" ? "Casos abiertos" : "Resumen mensual de convivencia",
        subtitle: `${filtered.length} caso(s)`,
        columns: ["Folio", "Estudiante(s)", "Curso", "Tipo", "Apertura", "Estado"],
        columnWidths: [0.8, 1.6, 1, 1, 0.8, 1],
        rows: filtered.map((c) => [
          c.folio,
          c.students.map((s) => `${s.student.last_names}, ${s.student.first_names}`).join(" / ") || "—",
          Array.from(new Set(c.students.map((s) => s.courseLabel ?? "—"))).join(", "),
          c.caseTypeLabel,
          formatDate(c.opened_at),
          CASE_STATUS_LABELS[c.status] ?? c.status,
        ]),
      };
    }
    case "casos_por_curso": {
      const cases = await listCases({ academicYearId });
      const byCourse = new Map<string, number>();
      for (const c of cases) {
        for (const label of new Set(c.students.map((s) => s.courseLabel ?? "Sin curso"))) {
          byCourse.set(label, (byCourse.get(label) ?? 0) + 1);
        }
      }
      return {
        title: "Casos por curso",
        subtitle: `${cases.length} caso(s) en total`,
        columns: ["Curso", "Casos"],
        columnWidths: [3, 1],
        rows: Array.from(byCourse, ([course, count]) => [course, String(count)]).sort((a, b) => a[0].localeCompare(b[0], "es")),
      };
    }
    case "casos_por_tipo": {
      const cases = await listCases({ academicYearId });
      const byType = new Map<string, number>();
      for (const c of cases) byType.set(c.caseTypeLabel, (byType.get(c.caseTypeLabel) ?? 0) + 1);
      return {
        title: "Casos por tipo",
        subtitle: `${cases.length} caso(s) en total`,
        columns: ["Tipo", "Casos"],
        columnWidths: [3, 1],
        rows: Array.from(byType, ([type, count]) => [type, String(count)]).sort((a, b) => Number(b[1]) - Number(a[1])),
      };
    }
    case "seguimientos_pendientes": {
      const followups = (await listFollowups()).filter((f) => f.status === "pendiente");
      return {
        title: "Seguimientos pendientes",
        subtitle: `${followups.length} seguimiento(s) pendiente(s)`,
        columns: ["Caso", "Responsable", "Objetivo", "Próxima fecha"],
        columnWidths: [1, 1, 2, 1],
        rows: followups.map((f) => [f.case_folio, f.responsible_name, f.objective ?? "—", f.next_date ? formatDate(f.next_date) : "—"]),
      };
    }
    case "acciones_preventivas": {
      const actions = await listPreventiveActions();
      return {
        title: "Acciones preventivas y formativas",
        subtitle: `${actions.length} acción(es) registrada(s)`,
        columns: ["Actividad", "Fecha", "Curso(s)", "Responsable"],
        columnWidths: [2, 1, 1.5, 1],
        rows: actions.map((a) => [a.activity, formatDate(a.action_date), a.courseLabels.join(", ") || "—", a.responsible_name]),
      };
    }
    case "avance_plan": {
      const items = await listManagementPlan(academicYearId);
      return {
        title: "Avance del Plan de Gestión de Convivencia Educativa",
        subtitle: `${items.length} acción(es) del plan`,
        columns: ["Acción", "Responsable", "Estado", "Avance"],
        columnWidths: [2.2, 1, 1, 0.6],
        rows: items.map((p) => [p.action, p.responsible_name, PLAN_STATUS_LABELS[p.status] ?? p.status, `${p.progress_percent}%`]),
      };
    }
  }
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar reportes de Convivencia" }, { status: 403 });
  }

  const { report_type, academic_year_id } = await request.json();
  const validTypes: ReportType[] = ["resumen_mensual", "casos_abiertos", "casos_por_curso", "casos_por_tipo", "seguimientos_pendientes", "acciones_preventivas", "avance_plan"];
  if (!validTypes.includes(report_type)) {
    return NextResponse.json({ error: "Tipo de reporte no válido" }, { status: 400 });
  }

  const report = await buildReport(report_type, academic_year_id || undefined);

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_reporte_convivencia",
    p_module: "convivencia",
    p_entity: "convivencia_cases",
    p_details: { report_type },
  });

  const buffer = await renderToBuffer(
    ConvivenciaReportDocument({ ...report, issuedAt: new Date().toISOString() })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="convivencia-${report_type}.pdf"`,
    },
  });
}
