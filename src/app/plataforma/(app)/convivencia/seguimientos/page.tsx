import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listFollowups } from "@/services/convivencia";
import { FOLLOWUP_STATUS_LABELS } from "@/features/convivencia/labels";

export const metadata: Metadata = { title: "Seguimientos — Convivencia Educativa" };

function Group({ title, items, tone }: { title: string; items: Awaited<ReturnType<typeof listFollowups>>; tone: "warning" | "danger" | "brand" | "success" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-400">({items.length})</span>
      </h3>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <Link href={`/plataforma/convivencia/casos/${f.case_id}`} className="text-sm font-medium text-brand-700 hover:underline">
                {f.case_folio}
              </Link>
              <p className="text-xs text-slate-500">{f.objective ?? f.case_title}</p>
            </div>
            <div className="flex items-center gap-3 text-right">
              <span className="text-xs text-slate-500">{f.responsible_name}</span>
              <span className="text-xs font-medium text-slate-700">{f.next_date ? formatDate(f.next_date) : formatDate(f.followup_date)}</span>
              <Badge tone={tone}>{FOLLOWUP_STATUS_LABELS[f.status]}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function SeguimientosPage() {
  const followups = await listFollowups();
  const today = new Date().toISOString().slice(0, 10);

  const pending = followups.filter((f) => f.status === "pendiente");
  const dueToday = pending.filter((f) => f.next_date === today);
  const overdue = pending.filter((f) => f.next_date && f.next_date < today);
  const upcoming = pending.filter((f) => f.next_date && f.next_date > today);
  const noDate = pending.filter((f) => !f.next_date);
  const completed = followups.filter((f) => f.status !== "pendiente");

  const hasAny = followups.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Vista general de seguimientos de todos los casos, agrupados por vencimiento.</p>

      {hasAny ? (
        <>
          <Group title="Vencidos" items={overdue} tone="danger" />
          <Group title="Hoy" items={dueToday} tone="warning" />
          <Group title="Próximos" items={upcoming} tone="brand" />
          <Group title="Sin fecha próxima" items={noDate} tone="brand" />
          <Group title="Completados / cancelados" items={completed} tone="success" />
        </>
      ) : (
        <Card>
          <CardBody>
            <EmptyState icon={CalendarClock} title="Sin seguimientos" description="Los seguimientos se agregan desde la ficha de cada caso." />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
