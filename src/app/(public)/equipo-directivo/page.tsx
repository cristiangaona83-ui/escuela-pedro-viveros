import type { Metadata } from "next";
import { Users2 } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { StaffCard } from "@/components/public/StaffCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStaffByArea } from "@/services/public-content";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Equipo Directivo" };

export default async function EquipoDirectivoPage() {
  const staff = await getStaffByArea("directivo");
  const hasDirector = staff.some((s) => s.role_title.toLowerCase().includes("director"));

  return (
    <>
      <PageHeader
        eyebrow="Equipo Directivo"
        title="Liderazgo pedagógico y administrativo"
        description="El equipo directivo conduce la gestión institucional, curricular y de convivencia de la escuela."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {!hasDirector && (
          <div className="mb-8 flex items-center gap-4 rounded-xl border border-brand-100 bg-brand-50 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
              <Users2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Director: {SITE.director}</p>
              <p className="text-sm text-slate-600">
                El resto del equipo directivo se incorporará a esta página desde la plataforma pedagógica.
              </p>
            </div>
          </div>
        )}

        {staff.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users2}
            title="Equipo en incorporación"
            description="Jefatura UTP, Convivencia Educativa, Inspectoría General y Coordinación PIE se publicarán aquí a medida que se registren en la plataforma."
          />
        )}
      </section>
    </>
  );
}
