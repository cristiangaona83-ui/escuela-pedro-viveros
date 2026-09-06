import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, Input } from "@/components/ui/Field";
import { NewCircularModal } from "@/features/documents/circulares/NewCircularModal";
import { CircularRowActions } from "@/features/documents/circulares/CircularRowActions";
import { listCircularesInformativas, listCircularesYears } from "@/services/documents";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { formatDate } from "@/lib/utils";
import type { DocumentStatus } from "@/types/database";

export const metadata: Metadata = { title: "Circulares Informativas" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

const STATUS_LABELS: Record<DocumentStatus, string> = { borrador: "Borrador", publicada: "Publicada", archivada: "Archivada" };
const STATUS_TONE: Record<DocumentStatus, "neutral" | "success" | "warning"> = { borrador: "warning", publicada: "success", archivada: "neutral" };

export default async function CircularesInformativasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; estado?: string; q?: string }>;
}) {
  const { year, estado, q } = await searchParams;
  const yearFilter = year ? Number(year) : undefined;
  const statusFilter = estado && estado in STATUS_LABELS ? (estado as DocumentStatus) : undefined;

  const [circulares, years, session] = await Promise.all([
    listCircularesInformativas({ year: yearFilter, status: statusFilter, search: q }),
    listCircularesYears(),
    getSessionContext(),
  ]);

  const canManage = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  function hrefWith(params: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    if (year) next.set("year", year);
    if (estado) next.set("estado", estado);
    if (q) next.set("q", q);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/plataforma/documentos/circulares?${qs}` : "/plataforma/documentos/circulares";
  }

  return (
    <div>
      <Link href="/plataforma/documentos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Documentos
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Circulares Informativas</h1>
        {canManage && <NewCircularModal />}
      </div>
      <p className="mt-1 text-sm text-slate-500">Circulares informativas emitidas por el establecimiento durante el año.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {years.map((y) => (
          <Link
            key={y}
            href={hrefWith({ year: yearFilter === y ? undefined : String(y) })}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              yearFilter === y ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <Card className="mt-4">
        <CardBody>
          <form className="mb-4 flex flex-wrap items-end gap-3">
            {year && <input type="hidden" name="year" value={year} />}
            <div className="w-56">
              <Input name="q" placeholder="Buscar por título o número" defaultValue={q ?? ""} />
            </div>
            <div className="w-48">
              <Select name="estado" defaultValue={estado ?? ""}>
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <button type="submit" className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Filtrar
            </button>
          </form>

          {circulares.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">N.º</th>
                    <th className="pb-2 pr-3 font-medium">Título</th>
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Incorporó</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {circulares.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-3 text-slate-600">{c.document_number ?? "—"}</td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-800">{c.title}</p>
                        {c.description && <p className="mt-0.5 max-w-md text-xs text-slate-500">{c.description}</p>}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{c.document_date ? formatDate(c.document_date) : "—"}</td>
                      <td className="py-3 pr-3 text-slate-600">{c.uploaderName ?? "—"}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <CircularRowActions circular={c} canManage={canManage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="Sin circulares registradas" description="Agrega la primera circular informativa del año." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
