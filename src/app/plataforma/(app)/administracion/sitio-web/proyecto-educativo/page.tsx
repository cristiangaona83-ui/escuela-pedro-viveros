import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { ProyectoEducativoContentForm } from "@/features/content/ProyectoEducativoContentForm";
import { getProyectoEducativoContent } from "@/services/school-config";

export const metadata: Metadata = { title: "Proyecto Educativo — Sitio Web" };

export default async function SitioWebProyectoEducativoPage() {
  const content = await getProyectoEducativoContent();

  return (
    <div>
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Proyecto Educativo</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Texto introductorio de la página pública de Proyecto Educativo. El PDF descargable se administra desde Documentos.
      </p>

      <Card className="mt-6">
        <CardBody>
          <ProyectoEducativoContentForm content={content} />
        </CardBody>
      </Card>
    </div>
  );
}
