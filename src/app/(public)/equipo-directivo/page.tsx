import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PageHeader } from "@/components/public/PageHeader";
import { DirectiveStaffCard } from "@/components/public/DirectiveStaffCard";
import { DIRECTIVE_TEAM } from "@/config/directive-team";

export const metadata: Metadata = { title: "Equipo Directivo" };

// Existencia real del archivo en public/ — así la tarjeta muestra la foto
// en cuanto se coloque ahí, sin depender de un fallback en el navegador.
function photoExists(photoSrc: string): boolean {
  return existsSync(join(process.cwd(), "public", photoSrc));
}

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
            <DirectiveStaffCard
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
