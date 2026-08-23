import type { Metadata } from "next";
import { PageHeader } from "@/components/public/PageHeader";
import { StaffPhotoCard } from "@/components/public/StaffPhotoCard";
import { DIRECTIVE_TEAM } from "@/config/directive-team";
import { photoExists } from "@/lib/staff-photo";

export const metadata: Metadata = { title: "Equipo Directivo" };

export default function EquipoDirectivoPage() {
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
        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {DIRECTIVE_TEAM.map((member) => (
            <StaffPhotoCard
              key={member.fullName}
              fullName={member.fullName}
              role={member.role}
              photoSrc={member.photoSrc}
              hasPhoto={photoExists(member.photoSrc)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
