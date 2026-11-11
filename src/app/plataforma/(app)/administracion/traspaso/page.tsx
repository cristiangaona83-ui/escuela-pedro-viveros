import type { Metadata } from "next";
import { ArrowRightLeft, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { listAcademicYears, getActiveAcademicYear } from "@/services/courses";
import { getRolloverPlan } from "@/services/year-rollover";
import { YearRolloverForm } from "@/features/admin/YearRolloverForm";

export const metadata: Metadata = { title: "Traspaso de año" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

export default async function TraspasoPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Traspaso de año</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="Solo Dirección y UTP pueden traspasar la información de un año al siguiente." />
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const [allYears, working] = await Promise.all([listAcademicYears(), getActiveAcademicYear()]);
  const years = allYears.slice().sort((a, b) => a.year - b.year);

  const from = years.find((y) => y.id === sp.from) ?? years.find((y) => y.id === working?.id) ?? years[0];
  const to = years.find((y) => y.id === sp.to && y.id !== from?.id) ?? years.find((y) => y.year === (from?.year ?? 0) + 1);
  const plan = from && to ? await getRolloverPlan(from.id, to.id) : null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Administración", href: "/plataforma/administracion" },
          { label: "Años académicos", href: "/plataforma/administracion/anios" },
          { label: "Traspaso de año" },
        ]}
      />
      <div className="mt-2 flex items-center gap-3">
        <ArrowRightLeft className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Traspaso de año</h1>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Pasa la información de un año al siguiente: crea los cursos del año destino y matricula a cada estudiante en el curso que le corresponde.
        No modifica nada del año de origen y se puede repetir sin duplicar matrículas.
      </p>

      <div className="mt-6">
        <YearRolloverForm
          years={years.map((y) => ({ id: y.id, year: y.year }))}
          fromId={from?.id ?? ""}
          toId={to?.id ?? ""}
          plan={plan}
        />
      </div>
    </div>
  );
}
