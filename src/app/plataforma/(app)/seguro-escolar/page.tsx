import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { listSeguroEscolarDeclarations } from "@/services/seguro-escolar";
import { listCourses } from "@/services/courses";
import { SeguroEscolarTable } from "@/features/seguro-escolar/SeguroEscolarTable";
import { SeguroEscolarFiltersBar } from "@/features/seguro-escolar/SeguroEscolarFiltersBar";
import type { SeguroEscolarAccidentType, SeguroEscolarStatus } from "@/types/database";

export const metadata: Metadata = { title: "Seguro Escolar" };

const MANAGE_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

export default async function SeguroEscolarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; course?: string; status?: string; accident?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionContext();
  const allowed = canWrite(session?.roles ?? [], [...MANAGE_ROLES]);

  if (!allowed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Seguro Escolar</h1>
        <div className="mt-6">
          <EmptyState icon={ShieldAlert} title="Sin acceso" description="No tienes permiso para ver el Seguro Escolar." />
        </div>
      </div>
    );
  }

  const [declarations, courses] = await Promise.all([
    listSeguroEscolarDeclarations({
      year: sp.year ? Number(sp.year) : undefined,
      month: sp.month ? Number(sp.month) : undefined,
      courseId: sp.course || undefined,
      status: (sp.status as SeguroEscolarStatus) || undefined,
      accidentType: (sp.accident as SeguroEscolarAccidentType) || undefined,
      search: sp.q || undefined,
    }),
    listCourses(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Seguro Escolar</h1>
          <p className="mt-1 text-sm text-slate-500">Declaración Individual de Accidente Escolar (Formulario 0374-3).</p>
        </div>
        <LinkButton href="/plataforma/seguro-escolar/nueva">+ Nueva Declaración de Accidente Escolar</LinkButton>
      </div>

      <div className="mt-4">
        <SeguroEscolarFiltersBar courses={courses.map((c) => ({ id: c.id, label: `${c.level} ${c.letter}`.trim() }))} />
      </div>

      <div className="mt-4">
        <SeguroEscolarTable declarations={declarations} />
      </div>
    </div>
  );
}
