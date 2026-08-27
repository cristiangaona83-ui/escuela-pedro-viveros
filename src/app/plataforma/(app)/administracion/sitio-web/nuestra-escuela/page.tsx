import type { Metadata } from "next";
import { School } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { NuestraEscuelaContentForm } from "@/features/content/NuestraEscuelaContentForm";
import { ContentCardsManager } from "@/features/content/ContentCardsManager";
import { getNuestraEscuelaContent } from "@/services/school-config";
import { listContentCardsAdmin } from "@/services/content-cards-admin";

export const metadata: Metadata = { title: "Nuestra Escuela — Sitio Web" };

export default async function SitioWebNuestraEscuelaPage() {
  const [content, sellos, valores] = await Promise.all([
    getNuestraEscuelaContent(),
    listContentCardsAdmin("nuestra_escuela_sellos"),
    listContentCardsAdmin("nuestra_escuela_valores"),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <School className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Nuestra Escuela</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Historia, misión, visión, sellos educativos y valores institucionales.</p>

      <div className="mt-6 space-y-6">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Historia, Misión y Visión</h2>
            <div className="mt-4"><NuestraEscuelaContentForm content={content} /></div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Sellos educativos</h2>
            <div className="mt-4"><ContentCardsManager section="nuestra_escuela_sellos" initialCards={sellos} showIconHref={false} auditLabel="Nuestra Escuela — Sellos" /></div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Valores institucionales</h2>
            <div className="mt-4"><ContentCardsManager section="nuestra_escuela_valores" initialCards={valores} showIconHref={false} auditLabel="Nuestra Escuela — Valores" /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
