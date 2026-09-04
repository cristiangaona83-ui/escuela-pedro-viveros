import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listTrashedCases } from "@/services/convivencia";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { RestoreCaseButton } from "@/features/convivencia/RestoreCaseButton";
import { PermanentlyDeleteCaseButton } from "@/features/convivencia/PermanentlyDeleteCaseButton";

const ADMIN_ROLES = ["director", "superadmin"] as const;

export const metadata: Metadata = { title: "Papelera — Convivencia Educativa" };

export default async function ConvivenciaPapeleraPage() {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ADMIN_ROLES])) {
    return (
      <div>
        <EmptyState icon={Trash2} title="Sin acceso" description="La papelera de Convivencia es exclusiva de Director y Superadministrador." />
      </div>
    );
  }

  const cases = await listTrashedCases();

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Papelera</h2>
        <p className="text-sm text-slate-500">
          Expedientes creados por error y enviados aquí por Director o Superadmin. Restaura el expediente para recuperarlo, o elimínalo de
          forma definitiva si corresponde.
        </p>
      </div>

      <Card className="mt-4">
        <CardBody>
          {cases.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {cases.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/plataforma/convivencia/casos/${c.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                      {c.folio}
                    </Link>
                    <p className="text-sm text-slate-800">{c.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Enviado a la papelera {c.deleted_at ? formatDate(c.deleted_at) : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RestoreCaseButton caseId={c.id} caseFolio={c.folio} />
                    <PermanentlyDeleteCaseButton caseId={c.id} caseFolio={c.folio} caseTitle={c.title} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Trash2} title="Papelera vacía" description="No hay expedientes enviados a la papelera." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
