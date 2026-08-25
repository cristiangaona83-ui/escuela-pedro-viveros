import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { PreventiveActionForm } from "@/features/convivencia/PreventiveActionForm";
import { listCourseOptions } from "@/services/courses";

export const metadata: Metadata = { title: "Nueva acción preventiva — Convivencia Educativa" };

export default async function NuevaPreventivaPage() {
  const courses = await listCourseOptions();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/plataforma/convivencia/preventivas" className="text-xs font-medium text-brand-700 hover:underline">
        ← Acciones preventivas
      </Link>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Nueva acción preventiva</h2>
      <Card className="mt-4">
        <CardBody>
          <PreventiveActionForm courses={courses} />
        </CardBody>
      </Card>
    </div>
  );
}
