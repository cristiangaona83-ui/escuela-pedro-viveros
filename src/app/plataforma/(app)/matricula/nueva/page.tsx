import type { Metadata } from "next";
import { UserPlus, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card, CardBody } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getActiveAcademicYear, listCourseOptions, levelSortIndex } from "@/services/courses";
import { emptyMatriculaForm, mergeMatriculaForm, type MatriculaFormData } from "@/lib/matricula";
import { StaffEnrollmentWizard } from "@/features/matricula/StaffEnrollmentWizard";
import type { PrematriculaRequestRow } from "@/types/database";

export const metadata: Metadata = { title: "Nueva matrícula" };

const ALLOWED_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "administrativo"] as const;

export default async function NuevaMatriculaPage({ searchParams }: { searchParams: Promise<{ pre?: string }> }) {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nueva matrícula</h1>
        <div className="mt-6">
          <EmptyState icon={Users} title="Sin acceso" description="No tienes permiso para registrar matrículas." />
        </div>
      </div>
    );
  }

  const { pre } = await searchParams;
  const supabase = await createClient();

  // Si viene de una pre-matrícula, la ficha parte con lo que completó la familia y el año de su campaña.
  let initial: MatriculaFormData = emptyMatriculaForm();
  let yearId: string | null = null;
  let yearLabel = "";
  let prematricula: PrematriculaRequestRow | null = null;
  if (pre) {
    const { data: request } = await supabase.from("prematricula_requests").select("*").eq("id", pre).maybeSingle();
    if (request) {
      prematricula = request as PrematriculaRequestRow;
      const { data: campaign } = await supabase
        .from("prematricula_campaigns")
        .select("academic_year_id, academic_years(year)")
        .eq("id", prematricula.campaign_id)
        .maybeSingle();
      const c = campaign as unknown as { academic_year_id: string; academic_years: { year: number } | null } | null;
      if (c) {
        yearId = c.academic_year_id;
        yearLabel = String(c.academic_years?.year ?? "");
      }
      // Las constancias que entrega el colegio las marca Inspectoría, no la familia.
      initial = {
        ...mergeMatriculaForm(prematricula.data as Partial<MatriculaFormData>),
        enrolled_at: new Date().toISOString().slice(0, 10),
        rules_informed: false,
        evaluation_rules_informed: false,
        privacy_informed: false,
        outings_informed: false,
        documents: {},
        notes: "",
        received_by: "",
      };
    }
  }

  if (!yearId) {
    const year = await getActiveAcademicYear();
    yearId = year?.id ?? null;
    yearLabel = String(year?.year ?? "");
  }

  const courseRows = yearId ? await listCourseOptions(yearId) : [];
  const courses = courseRows
    .slice()
    .sort((a, b) => levelSortIndex(a.level) - levelSortIndex(b.level) || a.letter.localeCompare(b.letter, "es"))
    .map((c) => ({ id: c.id, label: c.letter ? `${c.level} ${c.letter}` : c.level }));

  // Con una sola sección del nivel pedido, el curso ya viene elegido.
  const requested = prematricula?.level_requested ?? "";
  const candidates = requested ? courseRows.filter((c) => c.level === requested) : [];
  const initialCourseId = candidates.length === 1 ? candidates[0].id : "";

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Matrícula", href: "/plataforma/matricula" },
          { label: prematricula ? "Matricular desde pre-matrícula" : "Nueva matrícula" },
        ]}
      />
      <div className="mt-2 flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-brand-700" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nueva matrícula {yearLabel}</h1>
          <p className="text-sm text-slate-500">
            Ficha de matrícula en 3 pasos. Si el RUN ya existe, se actualiza la ficha del estudiante (continuidad) en vez de duplicarla.
          </p>
        </div>
      </div>

      {prematricula && (
        <p className="mt-4 rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
          Datos tomados de la pre-matrícula de <strong>{prematricula.student_name}</strong>. Revísalos, elige el curso y completa lo que corresponda a Inspectoría.
        </p>
      )}

      <Card className="mt-6">
        <CardBody>
          {!yearId ? (
            <EmptyState icon={Users} title="Sin año académico" description="Crea o elige un año académico para matricular." />
          ) : courses.length === 0 ? (
            <EmptyState
              icon={Users}
              title={`El año ${yearLabel} no tiene cursos`}
              description="Crea los cursos del año (o haz el Traspaso de año) antes de matricular."
            />
          ) : (
            <StaffEnrollmentWizard
              academicYearId={yearId}
              yearLabel={yearLabel}
              courses={courses}
              initial={initial}
              initialCourseId={initialCourseId}
              prematriculaId={prematricula?.id ?? null}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
