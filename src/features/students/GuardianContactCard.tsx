import { UserRound } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import type { GuardianContactRow } from "@/types/database";

export function GuardianContactCard({ guardian }: { guardian: GuardianContactRow }) {
  return (
    <Card>
      <CardBody>
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <UserRound className="h-4 w-4 text-slate-400" /> Apoderado / adulto responsable
        </h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Nombre</dt>
            <dd className="text-right text-slate-800">{guardian.full_name}</dd>
          </div>
          {guardian.relationship && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Vínculo</dt>
              <dd className="text-right text-slate-800">{guardian.relationship}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Teléfono</dt>
            <dd className="text-right text-slate-800">{guardian.phone || "No registrado"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Correo</dt>
            <dd className="text-right text-slate-800">{guardian.email || "No registrado"}</dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
}
