import type { Metadata } from "next";
import { Home } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { HomeAdmissionForm } from "@/features/content/HomeAdmissionForm";
import { HomeScheduleForm } from "@/features/content/HomeScheduleForm";
import { ContentCardsManager } from "@/features/content/ContentCardsManager";
import { getHomeAdmissionContent, getHomeScheduleContent } from "@/services/school-config";
import { listContentCardsAdmin } from "@/services/content-cards-admin";

export const metadata: Metadata = { title: "Inicio — Sitio Web" };

export default async function SitioWebInicioPage() {
  const [admission, schedule, destacados] = await Promise.all([
    getHomeAdmissionContent(),
    getHomeScheduleContent(),
    listContentCardsAdmin("inicio_destacados"),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <Home className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Inicio</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Contenido de la página principal del sitio público.</p>

      <div className="mt-6 space-y-6">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Admisión (Postulación SAE / Vacantes)</h2>
            <div className="mt-4"><HomeAdmissionForm content={admission} /></div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Horario de estudiantes</h2>
            <div className="mt-4"><HomeScheduleForm blocks={schedule.blocks} /></div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Tarjetas destacadas</h2>
            <p className="mt-1 text-xs text-slate-500">Las 3 tarjetas mostradas debajo del bloque de admisión.</p>
            <div className="mt-4"><ContentCardsManager section="inicio_destacados" initialCards={destacados} showIconHref auditLabel="Inicio" /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
