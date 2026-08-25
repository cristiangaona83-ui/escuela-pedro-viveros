import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { listProtocols } from "@/services/convivencia";
import { listDocuments } from "@/services/documents";
import { ProtocolForm } from "@/features/convivencia/ProtocolForm";
import { ToggleProtocolActiveButton } from "@/features/convivencia/ToggleProtocolActiveButton";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Protocolos — Convivencia Educativa" };

const WRITE_ROLES = ["director", "superadmin", "convivencia"] as const;

export default async function ProtocolosPage() {
  const [protocols, documents, session] = await Promise.all([listProtocols(false), listDocuments(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <p className="text-sm text-slate-500">
        Protocolos oficiales del establecimiento. El sistema solo organiza y registra el proceso — no automatiza decisiones disciplinarias.
      </p>

      {allowedToWrite && (
        <div className="mt-4">
          <ProtocolForm documents={documents} />
        </div>
      )}

      <Card className="mt-4">
        <CardBody>
          {protocols.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {protocols.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    {p.description && <p className="truncate text-xs text-slate-500">{p.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                    {allowedToWrite && <ToggleProtocolActiveButton id={p.id} active={p.active} name={p.name} />}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShieldCheck} title="Aún no hay protocolos cargados." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
