import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, ShieldCheck, HeartHandshake, LayoutGrid, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getUtpIndicators, getInspectoriaIndicators, getPieIndicators } from "@/services/areas-dashboard";
import { getConvivenciaDashboard } from "@/services/convivencia";

export const metadata: Metadata = { title: "Áreas de Gestión" };

const UTP_ROLES = ["director", "utp", "superadmin"] as const;
const INSPECTORIA_ROLES = ["director", "inspectoria_general", "superadmin"] as const;
const CONVIVENCIA_ROLES = ["director", "convivencia", "superadmin"] as const;
const PIE_ROLES = ["director", "pie", "superadmin", "educadora_diferencial", "psicopedagoga", "fonoaudiologa", "psicologo"] as const;

export default async function AreasDeGestionPage() {
  const session = await getSessionContext();
  const roles = session?.roles ?? [];

  const canSeeUtp = canWrite(roles, [...UTP_ROLES]);
  const canSeeInspectoria = canWrite(roles, [...INSPECTORIA_ROLES]);
  const canSeeConvivencia = canWrite(roles, [...CONVIVENCIA_ROLES]);
  const canSeePie = canWrite(roles, [...PIE_ROLES]);

  const [utp, inspectoria, convivencia, pie] = await Promise.all([
    canSeeUtp ? getUtpIndicators() : Promise.resolve(null),
    canSeeInspectoria ? getInspectoriaIndicators() : Promise.resolve(null),
    canSeeConvivencia ? getConvivenciaDashboard() : Promise.resolve(null),
    canSeePie ? getPieIndicators() : Promise.resolve(null),
  ]);

  const noAccess = !canSeeUtp && !canSeeInspectoria && !canSeeConvivencia && !canSeePie;

  return (
    <div>
      <p className="text-sm text-slate-500">
        Vista resumida de las unidades de gestión del establecimiento. Solo indicadores agregados — sin datos individuales sensibles.
      </p>

      {noAccess && (
        <div className="mt-6">
          <EmptyState icon={LayoutGrid} title="Sin áreas asignadas" description="Tu rol no tiene acceso a ninguna Área de Gestión." />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {canSeeUtp && utp && (
          <Link href="/plataforma/areas/utp">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <div className="flex items-center gap-2 text-slate-500">
                  <BookOpen className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-slate-900">UTP</span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-[11px] text-slate-400">Cursos activos</dt>
                    <dd className="text-xl font-semibold text-slate-900">{utp.activeCourses}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Evaluaciones</dt>
                    <dd className="text-xl font-semibold text-slate-900">{utp.evaluationsThisYear}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Por revisar</dt>
                    <dd className="text-xl font-semibold text-amber-600">{utp.plansPendingReview}</dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Ir a UTP <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        )}

        {canSeeInspectoria && inspectoria && (
          <Link href="/plataforma/areas/inspectoria">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarCheck className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-slate-900">Inspectoría General</span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-[11px] text-slate-400">Asistencia hoy</dt>
                    <dd className="text-xl font-semibold text-slate-900">{inspectoria.attendanceToday}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Atrasos hoy</dt>
                    <dd className="text-xl font-semibold text-amber-600">{inspectoria.lateToday}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Autorizaciones</dt>
                    <dd className="text-xl font-semibold text-slate-900">{inspectoria.activePickupAuthorizations}</dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Ir a Inspectoría <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        )}

        {canSeeConvivencia && convivencia && (
          <Link href="/plataforma/convivencia">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-slate-900">Convivencia Educativa</span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-[11px] text-slate-400">Abiertos</dt>
                    <dd className="text-xl font-semibold text-slate-900">{convivencia.casesByStatus.abierto ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">En seguimiento</dt>
                    <dd className="text-xl font-semibold text-slate-900">{convivencia.casesByStatus.en_seguimiento ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Vencidos</dt>
                    <dd className="text-xl font-semibold text-red-600">{convivencia.followupsOverdue}</dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Ir a Convivencia <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        )}

        {canSeePie && pie && (
          <Link href="/plataforma/pie">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <div className="flex items-center gap-2 text-slate-500">
                  <HeartHandshake className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-slate-900">PIE</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <dt className="text-[11px] text-slate-400">Casos activos</dt>
                    <dd className="text-xl font-semibold text-slate-900">{pie.activeCases}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Estudiantes</dt>
                    <dd className="text-xl font-semibold text-slate-900">{pie.studentsSupported}</dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Ir a PIE <ArrowRight className="h-4 w-4" />
                </span>
              </CardBody>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
