import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { PrematriculaPublicForm } from "@/components/public/PrematriculaPublicForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { COURSE_LEVEL_ORDER } from "@/lib/course-levels";

// Formulario privado de una campaña: solo para quienes reciben el enlace.
export const metadata: Metadata = { title: "Pre-matrícula", robots: { index: false, follow: false } };

export default async function PrematriculaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // RLS: la lectura anónima solo devuelve campañas abiertas (activas y dentro de su plazo).
  const { data } = await supabase
    .from("prematricula_campaigns")
    .select("title, intro_text, academic_years(year)")
    .eq("token", token)
    .maybeSingle();
  const campaign = data as unknown as { title: string; intro_text: string | null; academic_years: { year: number } | null } | null;

  if (!campaign) {
    return (
      <>
        <PageHeader eyebrow="Pre-matrícula" title="Enlace no disponible" description="Este enlace no existe o la pre-matrícula ya cerró." />
        <section className="mx-auto max-w-2xl px-4 py-14">
          <EmptyState icon={CalendarX2} title="Pre-matrícula cerrada" description="Comunícate con el establecimiento para solicitar un cupo o un nuevo enlace." />
        </section>
      </>
    );
  }

  const yearLabel = String(campaign.academic_years?.year ?? "");

  return (
    <>
      <PageHeader
        eyebrow={`Año escolar ${yearLabel}`}
        title={campaign.title}
        description={campaign.intro_text ?? "Completa la ficha de tu hijo/a. Solo toma unos minutos."}
      />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PrematriculaPublicForm token={token} yearLabel={yearLabel} levels={COURSE_LEVEL_ORDER} />
      </section>
    </>
  );
}
