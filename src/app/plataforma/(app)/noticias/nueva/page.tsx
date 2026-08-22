import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { NewsForm } from "@/features/news/NewsForm";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Nueva noticia" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NuevaNoticiaPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/noticias");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nueva noticia</h1>
      <Card className="mt-6">
        <CardBody>
          <NewsForm />
        </CardBody>
      </Card>
    </div>
  );
}
