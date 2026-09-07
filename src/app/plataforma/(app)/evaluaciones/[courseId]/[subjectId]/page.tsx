import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvaluationsListClient } from "@/features/grades/EvaluationsListClient";
import { getCourseSubjectEvaluations } from "@/services/grade-overview";
import { getTeachableCourseSubjects, listOpenPeriods } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Evaluaciones" };

const ACCESS_ROLES = ["director", "utp", "docente", "superadmin"] as const;
const MANAGEMENT_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EvaluacionesAsignaturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; subjectId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { courseId, subjectId } = await params;
  const sp = await searchParams;
  const session = await getSessionContext();
  const allowed = canWrite(session?.roles ?? [], [...ACCESS_ROLES]);
  const isManagement = canWrite(session?.roles ?? [], [...MANAGEMENT_ROLES]);

  if (!allowed || !session) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Evaluaciones</h1>
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title="Sin acceso" description="No tienes permiso para ver las evaluaciones." />
        </div>
      </div>
    );
  }

  // Defensa en profundidad además de RLS: un docente solo puede entrar a un
  // curso+asignatura que efectivamente tiene asignado (mismo alcance que ya
  // usaba el selector de EvaluationForm antes de esta reorganización).
  const options = await getTeachableCourseSubjects();
  const scope = options.find((o) => o.course_id === courseId && o.subject_id === subjectId);
  if (!isManagement && !scope) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Evaluaciones</h1>
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title="Sin acceso" description="No tienes esta asignatura asignada en este curso." />
        </div>
      </div>
    );
  }

  const periods = await listOpenPeriods();
  if (periods.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Evaluaciones</h1>
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title="Sin períodos configurados" description="Pide a Dirección o UTP que configure el año académico." />
        </div>
      </div>
    );
  }
  const selectedPeriodId = sp.period || periods.find((p) => p.status === "abierto")?.id || periods[periods.length - 1].id;

  const data = await getCourseSubjectEvaluations(courseId, subjectId, selectedPeriodId);
  if (!data) {
    return (
      <div>
        <EmptyState icon={ClipboardList} title="No encontrado" description="El curso o la asignatura no existen." />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 text-xs font-medium text-brand-700">
        <Link href="/plataforma/evaluaciones" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Evaluaciones
        </Link>
        <span className="text-slate-400">/</span>
        <Link href={`/plataforma/evaluaciones/${courseId}`} className="hover:underline">
          {data.courseLabel}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500">{data.subjectName}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {data.subjectName} — {data.courseLabel}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Evaluaciones del período seleccionado.</p>
        </div>
        <form className="flex items-end gap-2">
          <div className="w-56">
            <Select name="period" defaultValue={selectedPeriodId}>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.academic_years?.year} · {p.name} {p.status === "cerrado" ? "(cerrado)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cambiar período
          </button>
        </form>
      </div>

      <div className="mt-6">
        <EvaluationsListClient
          data={data}
          year={String(periods.find((p) => p.id === selectedPeriodId)?.academic_years?.year ?? "")}
          periodId={selectedPeriodId}
          userId={session.userId}
          canManageGrades={isManagement}
        />
      </div>
    </div>
  );
}
