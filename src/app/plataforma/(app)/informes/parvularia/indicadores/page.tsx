import type { Metadata } from "next";
import { ListChecks, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { IndicatorManager } from "@/features/parvularia/IndicatorManager";
import type { ParvulariaIndicatorRow } from "@/types/database";

export const metadata: Metadata = { title: "Indicadores — Informe de Prebásica" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export default async function ParvulariaIndicatorsPage() {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Indicadores</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="Solo Dirección y UTP pueden administrar los indicadores." />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.from("parvularia_indicators").select("*").order("sort_order", { ascending: true });

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Gestión Pedagógica", href: "/plataforma/areas/utp" },
          { label: "Informes", href: "/plataforma/informes?nivel=prebasica" },
          { label: "Indicadores de Prebásica" },
        ]}
      />
      <div className="mt-2 flex items-center gap-3">
        <ListChecks className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Indicadores del Informe Pedagógico</h1>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Agrega, edita, reordena o desactiva los indicadores de Prekínder y Kínder. Los cambios se aplican a los informes nuevos y a la
        impresión de los ya registrados; lo que ya se evaluó en un indicador desactivado se conserva, solo deja de mostrarse.
      </p>

      <div className="mt-6">
        <IndicatorManager initialIndicators={(data ?? []) as ParvulariaIndicatorRow[]} />
      </div>
    </div>
  );
}
