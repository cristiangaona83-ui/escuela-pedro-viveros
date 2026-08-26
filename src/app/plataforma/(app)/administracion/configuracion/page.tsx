import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { getGradingConfig, getCertificateSignature, getInstitutionalProfile } from "@/services/school-config";
import { GradingScaleForm, SignatureForm, InstitutionalProfileForm } from "@/features/admin/ConfigForms";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Configuración institucional" };

export default async function ConfiguracionPage() {
  const [gradingConfig, signature, institutionalProfile] = await Promise.all([
    getGradingConfig(),
    getCertificateSignature(),
    getInstitutionalProfile(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Configuración institucional</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Estos valores se usan en toda la plataforma: libro de notas, certificados e informes.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="font-semibold text-slate-900">Datos institucionales</h2>
            <p className="mt-1 text-xs text-slate-500">
              Nombre, RBD, dirección y reconocimiento oficial. Aparecen en certificados, informes y en el sitio público.
            </p>
            <div className="mt-4">
              <InstitutionalProfileForm profile={institutionalProfile} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Escala de evaluación</h2>
            <p className="mt-1 text-xs text-slate-500">No se asumen reglas de promoción: defínelas según el Reglamento de Evaluación.</p>
            <div className="mt-4">
              <GradingScaleForm config={gradingConfig} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Firma para certificados</h2>
            <p className="mt-1 text-xs text-slate-500">Aparece en el Certificado de Alumno Regular y los informes de calificaciones.</p>
            <div className="mt-4">
              <SignatureForm name={signature.name || SITE.director} title={signature.title || "Director(a)"} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
