import type { Metadata } from "next";
import { PageHeader } from "@/components/public/PageHeader";
import { StaffPhotoCard } from "@/components/public/StaffPhotoCard";
import { getStaffSection } from "@/services/public-content";
import { resolveStaffPhoto } from "@/lib/staff-photo";

export const metadata: Metadata = { title: "Equipo Directivo" };

export default async function EquipoDirectivoPage() {
  const team = await getStaffSection("directivo");

  return (
    <>
      <PageHeader
        eyebrow="Equipo Directivo"
        title="Liderazgo pedagógico y administrativo"
      />

      <section className="mx-auto max-w-4xl px-4 pt-14 sm:px-6 lg:px-8">
        <p className="text-justify text-[15px] leading-relaxed text-slate-600 sm:text-base">
          El equipo directivo conduce la gestión institucional, pedagógica, curricular, administrativa y de
          convivencia de la Escuela Profesor Pedro Viveros Ormeño, promoviendo una gestión colaborativa
          orientada al aprendizaje, el bienestar y el desarrollo integral de nuestros estudiantes.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {team.map((member) => {
            const { src, hasPhoto } = resolveStaffPhoto(member.staff_member.photo_url);
            return (
              <StaffPhotoCard
                key={member.id}
                fullName={member.staff_member.full_name}
                role={member.role_title}
                photoSrc={src}
                hasPhoto={hasPhoto}
                initials={member.staff_member.initials ?? undefined}
              />
            );
          })}
        </div>
      </section>
    </>
  );
}
