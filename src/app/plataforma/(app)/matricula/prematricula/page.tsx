import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Tabs } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getActiveAcademicYear, listAcademicYears } from "@/services/courses";
import { SITE } from "@/config/site";
import { formatDate, formatRun } from "@/lib/utils";
import { PrematriculaCampaigns, type CampaignView } from "@/features/matricula/PrematriculaCampaigns";
import { PREMATRICULA_STATUS_LABEL, PREMATRICULA_STATUS_TONE as STATUS_TONE } from "@/lib/matricula";
import type { PrematriculaStatus } from "@/types/database";

export const metadata: Metadata = { title: "Pre-matrícula" };

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "administrativo"] as const;


export default async function PrematriculaPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pre-matrícula</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para ver la pre-matrícula." />
        </div>
      </div>
    );
  }

  const { estado } = await searchParams;
  const filter: PrematriculaStatus | "todas" = estado && estado in PREMATRICULA_STATUS_LABEL ? (estado as PrematriculaStatus) : "todas";
  const supabase = await createClient();
  const [years, working] = await Promise.all([listAcademicYears(), getActiveAcademicYear()]);

  const [{ data: campaigns }, { data: allRequests }] = await Promise.all([
    supabase.from("prematricula_campaigns").select("*, academic_years(year)").order("created_at", { ascending: false }),
    supabase
      .from("prematricula_requests")
      .select("id, campaign_id, status, student_run, student_name, level_requested, admission_type, guardian_name, guardian_phone, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  type Req = {
    id: string;
    campaign_id: string;
    status: PrematriculaStatus;
    student_run: string | null;
    student_name: string | null;
    level_requested: string | null;
    admission_type: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    created_at: string;
  };
  const requests = (allRequests ?? []) as unknown as Req[];
  const campaignViews: CampaignView[] = ((campaigns ?? []) as unknown as {
    id: string; title: string; token: string; active: boolean; closes_at: string | null; academic_years: { year: number } | null;
  }[]).map((c) => ({
    id: c.id,
    title: c.title,
    year: c.academic_years?.year ?? 0,
    active: c.active,
    closesAt: c.closes_at,
    url: `${SITE.domains.public}/pre-matricula/${c.token}`,
    requests: requests.filter((r) => r.campaign_id === c.id).length,
    pending: requests.filter((r) => r.campaign_id === c.id && r.status === "pendiente").length,
  }));
  const campaignTitle = new Map(campaignViews.map((c) => [c.id, `${c.title}`]));

  const shown = filter === "todas" ? requests : requests.filter((r) => r.status === filter);
  const counts = (s: PrematriculaStatus) => requests.filter((r) => r.status === s).length;

  // Pre-matrícula mira al año siguiente: por defecto se propone el año que sigue al de trabajo.
  const sortedYears = years.slice().sort((a, b) => a.year - b.year);
  const next = sortedYears.find((y) => y.year === (working?.year ?? 0) + 1) ?? sortedYears.find((y) => y.id === working?.id) ?? sortedYears[0];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Matrícula", href: "/plataforma/matricula" }, { label: "Pre-matrícula" }]} />
      <div className="mt-2 flex items-center gap-3">
        <Inbox className="h-6 w-6 text-brand-700" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pre-matrícula en línea</h1>
          <p className="max-w-3xl text-sm text-slate-500">
            Crea una campaña, comparte su enlace con las familias y revisa aquí las fichas que van completando. Cada solicitud se convierte en matrícula con un clic.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PrematriculaCampaigns years={sortedYears.map((y) => ({ id: y.id, year: y.year }))} defaultYearId={next?.id ?? ""} campaigns={campaignViews} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Solicitudes recibidas</h2>
      <div className="mt-3">
        <Tabs
          basePath="/plataforma/matricula/prematricula"
          paramName="estado"
          tabs={[
            { key: "todas", label: `Todas (${requests.length})` },
            { key: "pendiente", label: `Por revisar (${counts("pendiente")})` },
            { key: "aceptada", label: `Aceptadas (${counts("aceptada")})` },
            { key: "matriculada", label: `Matriculadas (${counts("matriculada")})` },
            { key: "rechazada", label: `Rechazadas (${counts("rechazada")})` },
          ]}
          active={filter}
        />
      </div>
      <Card className="mt-3">
        <CardBody>
          {shown.length === 0 ? (
            <EmptyState icon={Inbox} title="Sin solicitudes" description="Cuando una familia envíe la ficha desde el enlace, aparecerá aquí." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Estudiante</th>
                    <th className="py-2 pr-3">Postula a</th>
                    <th className="py-2 pr-3">Apoderado/a</th>
                    <th className="py-2 pr-3">Recibida</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-medium text-slate-800">{r.student_name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{formatRun(r.student_run)} · {campaignTitle.get(r.campaign_id)}</p>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {r.level_requested ?? "—"} {r.admission_type && <span className="text-xs text-slate-400">({r.admission_type})</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {r.guardian_name ?? "—"}
                        {r.guardian_phone && <p className="text-xs text-slate-400">{r.guardian_phone}</p>}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{formatDate(r.created_at)}</td>
                      <td className="py-2 pr-3"><Badge tone={STATUS_TONE[r.status]}>{PREMATRICULA_STATUS_LABEL[r.status]}</Badge></td>
                      <td className="py-2 pr-3 text-right">
                        <Link href={`/plataforma/matricula/prematricula/${r.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
