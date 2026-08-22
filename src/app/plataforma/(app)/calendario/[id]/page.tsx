import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { EventForm } from "@/features/calendar/EventForm";
import { getEvent } from "@/services/events";
import { listCourseOptions } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar evento" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, courseOptions, session] = await Promise.all([
    getEvent(id),
    listCourseOptions(),
    getSessionContext(),
  ]);

  if (!event) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/calendario");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar evento</h1>
      <Card className="mt-6">
        <CardBody>
          <EventForm event={event} courseOptions={courseOptions} />
        </CardBody>
      </Card>
    </div>
  );
}
