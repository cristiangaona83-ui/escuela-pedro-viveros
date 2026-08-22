import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { DocumentForm } from "@/features/documents/DocumentForm";
import { getDocument } from "@/services/documents";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar documento" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export default async function EditarDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [document, session] = await Promise.all([getDocument(id), getSessionContext()]);

  if (!document) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/documentos");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar documento</h1>
      <Card className="mt-6">
        <CardBody>
          <DocumentForm document={document} />
        </CardBody>
      </Card>
    </div>
  );
}
