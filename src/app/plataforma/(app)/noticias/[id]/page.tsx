import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { NewsForm } from "@/features/news/NewsForm";
import { getNewsById } from "@/services/news-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar noticia" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarNoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [news, session] = await Promise.all([getNewsById(id), getSessionContext()]);

  if (!news) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/noticias");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Editar noticia</h1>
      <Card className="mt-6">
        <CardBody>
          <NewsForm news={news} />
        </CardBody>
      </Card>
    </div>
  );
}
