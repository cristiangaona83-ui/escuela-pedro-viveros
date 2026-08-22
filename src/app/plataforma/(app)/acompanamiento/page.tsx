import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { ObservationForm } from "@/features/observations/ObservationForm";
import { listObservations } from "@/services/classroom-observations";
import { listTeachers, listCourseOptions } from "@/services/courses";
import { listSubjectOptions } from "@/services/subjects";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Acompañamiento al Aula" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function AcompanamientoPage() {
  const session = await getSessionContext();
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  const [observations, teacherRows, courseOptions, subjectOptions] = await Promise.all([
    listObservations(),
    allowedToWrite ? listTeachers() : Promise.resolve([]),
    allowedToWrite ? listCourseOptions() : Promise.resolve([]),
    allowedToWrite ? listSubjectOptions() : Promise.resolve([]),
  ]);

  const teacherOptions = teacherRows
    .map((r) => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Acompañamiento al Aula</h1>
      <p className="mt-1 text-sm text-slate-500">
        Observaciones de Dirección y UTP: foco, fortalezas, oportunidades de mejora y acuerdos con cada docente.
      </p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_400px]" : ""}`}>
        <Card>
          <CardBody>
            {observations.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {observations.map((o) => (
                  <li key={o.id} className="py-3">
                    <Link
                      href={allowedToWrite ? `/plataforma/acompanamiento/${o.id}` : "#"}
                      className={`flex flex-wrap items-center justify-between gap-2 ${!allowedToWrite ? "pointer-events-none" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {o.teacher?.full_name} — {o.courses ? `${o.courses.level} ${o.courses.letter}` : "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {o.focus || "Sin foco registrado"}
                          {o.subjects?.name && ` · ${o.subjects.name}`} · {formatDate(o.obs_date)} · {o.observer?.full_name}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Eye} title="Sin observaciones registradas" description="Registra la primera observación de acompañamiento al aula." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nueva observación</h2>
              <div className="mt-4">
                <ObservationForm
                  teacherOptions={teacherOptions}
                  courseOptions={courseOptions}
                  subjectOptions={subjectOptions}
                  currentUserId={session!.userId}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
