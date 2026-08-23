import type { Metadata } from "next";
import { PageHeader } from "@/components/public/PageHeader";
import { StaffPhotoCard } from "@/components/public/StaffPhotoCard";
import { getSupportStaffCategories } from "@/config/support-staff";
import { photoExists } from "@/lib/staff-photo";

export const metadata: Metadata = { title: "Asistentes de la Educación" };

export default function AsistentesDeLaEducacionPage() {
  const categories = getSupportStaffCategories();

  return (
    <>
      <PageHeader eyebrow="Comunidad Escolar" title="Asistentes de la Educación" />

      <section className="mx-auto max-w-4xl px-4 pt-14 sm:px-6 lg:px-8">
        <p className="text-justify text-[15px] leading-relaxed text-slate-600 sm:text-base">
          Los Asistentes de la Educación cumplen un rol fundamental en nuestra comunidad escolar, contribuyendo
          desde sus distintas funciones al bienestar, la seguridad, el acompañamiento y el adecuado funcionamiento
          de la Escuela Profesor Pedro Viveros Ormeño. Su trabajo diario complementa la labor educativa y
          fortalece las condiciones necesarias para el desarrollo integral de nuestros estudiantes.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category.key} className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-medium tracking-tight text-slate-900">{category.label}</h2>
          <div className="mt-8 grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {category.members.map((member) => (
              <StaffPhotoCard
                key={member.fullName}
                fullName={member.fullName}
                role={member.role}
                photoSrc={member.photoSrc}
                hasPhoto={photoExists(member.photoSrc)}
                initials={member.initials}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
