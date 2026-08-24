import type { Metadata } from "next";
import { PageHeader } from "@/components/public/PageHeader";
import { StaffPhotoCard } from "@/components/public/StaffPhotoCard";
import { getStaffSection } from "@/services/public-content";
import { resolveStaffPhoto } from "@/lib/staff-photo";

export const metadata: Metadata = { title: "Asistentes de la Educación" };

const CATEGORY_ORDER = ["apoyo_educativo", "salud_bienestar", "apoyo_administrativo", "auxiliares_servicios"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  apoyo_educativo: "Apoyo educativo",
  salud_bienestar: "Salud y Bienestar",
  apoyo_administrativo: "Apoyo administrativo y de funcionamiento",
  auxiliares_servicios: "Auxiliares de Servicios",
};

export default async function AsistentesDeLaEducacionPage() {
  const staff = await getStaffSection("asistente");

  const categories = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    members: staff.filter((m) => m.category === key),
  })).filter((c) => c.members.length > 0);

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
            {category.members.map((member) => {
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
      ))}
    </>
  );
}
