import type { Metadata } from "next";
import Link from "next/link";
import { Folder, ShieldAlert } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { listSeguroEscolarDeclarations, listSeguroEscolarCourseFolders } from "@/services/seguro-escolar";
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

  const year = sp.year ? Number(sp.year) : new Date().getFullYear();

  const [declarations, courses, folders] = await Promise.all([
    listSeguroEscolarDeclarations({
      year: sp.year ? Number(sp.year) : undefined,
      month: sp.month ? Number(sp.month) : undefined,
      courseId: sp.course || undefined,
      status: (sp.status as SeguroEscolarStatus) || undefined,
      accidentType: (sp.accident as SeguroEscolarAccidentType) || undefined,
      search: sp.q || undefined,
    }),
    listCourses(),
    listSeguroEscolarCourseFolders(year),
  ]);

  const selectedFolder = folders.find((f) => f.id === sp.course);

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
        <h2 className="text-sm font-semibold text-slate-900">Vista por curso</h2>
        {folders.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {folders.map((f) => (
              <Link key={f.id} href={`/plataforma/seguro-escolar?course=${f.id}&year=${year}`}>
                <Card className={`h-full transition-shadow hover:shadow-md ${sp.course === f.id ? "ring-2 ring-brand-500" : ""}`}>
                  <CardBody className="flex flex-col items-center gap-1 py-4 text-center">
                    <Folder className="h-6 w-6 text-brand-600" strokeWidth={1.5} />
                    <span className="text-xs font-semibold text-slate-900">{f.courseLabel}</span>
                    <span className="text-[11px] text-slate-500">{f.enrollmentCount} matriculado{f.enrollmentCount === 1 ? "" : "s"}</span>
                    <span className="text-[11px] font-medium text-brand-700">{f.declarationCount} seguro{f.declarationCount === 1 ? "" : "s"} {year}</span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No hay cursos activos en el año académico actual.</p>
        )}
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {selectedFolder ? `Accidentes — ${selectedFolder.courseLabel}` : "Todos los accidentes"}
            </h2>
            {selectedFolder && (
              <Link href="/plataforma/seguro-escolar" className="text-xs font-medium text-brand-700 hover:underline">
                ← Ver todos los cursos
              </Link>
            )}
          </div>
          <div className="mt-3">
            <SeguroEscolarFiltersBar courses={courses.map((c) => ({ id: c.id, label: `${c.level} ${c.letter}`.trim() }))} />
          </div>
          <div className="mt-4">
            <SeguroEscolarTable declarations={declarations} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
