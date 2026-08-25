import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { SituationForm } from "@/features/convivencia/SituationForm";
import { listCaseTypes } from "@/services/convivencia";
import { listActiveStudents } from "@/services/certificates";

export const metadata: Metadata = { title: "Registrar situación — Convivencia Educativa" };

export default async function NuevaSituacionPage() {
  const [caseTypes, students] = await Promise.all([listCaseTypes(), listActiveStudents()]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/plataforma/convivencia/situaciones" className="text-xs font-medium text-brand-700 hover:underline">
        ← Situaciones
      </Link>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Registrar situación</h2>
      <p className="mt-1 text-sm text-slate-500">
        Después de guardar podrás mantenerla como registro simple o convertirla en Caso de Convivencia.
      </p>
      <Card className="mt-4">
        <CardBody>
          <SituationForm caseTypes={caseTypes} students={students} />
        </CardBody>
      </Card>
    </div>
  );
}
