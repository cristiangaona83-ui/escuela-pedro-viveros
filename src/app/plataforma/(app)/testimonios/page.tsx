import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { TestimonialActions } from "@/features/testimonials/TestimonialActions";
import { listTestimonialsAdmin } from "@/services/testimonials";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import type { TestimonialStatus } from "@/types/database";

export const metadata: Metadata = { title: "Testimonios" };

const WRITE_ROLES = ["director", "administrativo", "superadmin"] as const;

const STATUS_LABELS: Record<TestimonialStatus, string> = { pendiente: "Pendiente", aprobado: "Aprobado", rechazado: "Rechazado" };
const STATUS_TONE: Record<TestimonialStatus, "warning" | "success" | "danger"> = { pendiente: "warning", aprobado: "success", rechazado: "danger" };

export default async function TestimoniosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const session = await getSessionContext();
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  if (!allowedToWrite) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Testimonios</h1>
        <div className="mt-6">
          <EmptyState icon={MessageCircleHeart} title="Sin acceso" description="No tienes permiso para administrar los testimonios." />
        </div>
      </div>
    );
  }

  const statusFilter = estado && estado in STATUS_LABELS ? (estado as TestimonialStatus) : undefined;
  const testimonials = await listTestimonialsAdmin(statusFilter);

  function hrefFor(status?: TestimonialStatus) {
    return status ? `/plataforma/testimonios?estado=${status}` : "/plataforma/testimonios";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Testimonios</h1>
      <p className="mt-1 text-sm text-slate-500">
        Comentarios enviados por apoderados desde el sitio público. Aprueba los que quieras publicar en “Testimonios”.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={hrefFor(undefined)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${!statusFilter ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          Todos
        </Link>
        {(Object.keys(STATUS_LABELS) as TestimonialStatus[]).map((s) => (
          <Link
            key={s}
            href={hrefFor(s)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${statusFilter === s ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {testimonials.length > 0 ? (
          testimonials.map((t) => (
            <Card key={t.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{t.full_name}</p>
                    {t.relationship && <p className="text-xs text-slate-500">{t.relationship}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">
                      Enviado {formatDate(t.created_at)}
                      {t.reviewedByName && ` · Revisado por ${t.reviewedByName}`}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{t.message}</p>
                <TestimonialActions id={t.id} fullName={t.full_name} status={t.status} />
              </CardBody>
            </Card>
          ))
        ) : (
          <Card>
            <CardBody>
              <EmptyState icon={MessageCircleHeart} title="Sin testimonios" description="Todavía no hay comentarios en esta categoría." />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
