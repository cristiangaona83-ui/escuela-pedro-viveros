import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listEvents } from "@/services/events";
import { listCourseOptions } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { EventForm } from "@/features/calendar/EventForm";
import { DeleteEventButton } from "@/features/calendar/DeleteEventButton";

export const metadata: Metadata = { title: "Calendario" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function CalendarioPage() {
  const [events, courseOptions, session] = await Promise.all([
    listEvents(),
    listCourseOptions(),
    getSessionContext(),
  ]);

  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Calendario Institucional</h1>
      <p className="mt-1 text-sm text-slate-500">
        Reuniones, evaluaciones, actividades, salidas educativas, consejos de profesores y cierres de semestre.
      </p>

      <div className={`mt-6 grid gap-6 ${allowedToWrite ? "lg:grid-cols-[1fr_380px]" : ""}`}>
        <Card>
          <CardBody>
            {events.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{e.title}</p>
                        <Badge tone="brand">{e.event_type}</Badge>
                        {e.courses && <Badge tone="neutral">{e.courses.level} {e.courses.letter}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(e.start_at, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {e.end_at && ` — ${formatDate(e.end_at, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                    {allowedToWrite && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          href={`/plataforma/calendario/${e.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Editar ${e.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <DeleteEventButton eventId={e.id} title={e.title} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Calendar} title="Sin eventos programados" description="Crea el primer evento del calendario institucional." />
            )}
          </CardBody>
        </Card>

        {allowedToWrite && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-slate-900">Nuevo evento</h2>
              <div className="mt-4">
                <EventForm courseOptions={courseOptions} />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
