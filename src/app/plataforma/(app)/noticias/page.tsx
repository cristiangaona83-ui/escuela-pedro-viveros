import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { ToggleNewsPublishedButton } from "@/features/news/ToggleNewsPublishedButton";
import { listNewsAdmin } from "@/services/news-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Noticias" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function NoticiasAdminPage() {
  const [news, session] = await Promise.all([listNewsAdmin(), getSessionContext()]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Noticias</h1>
          <p className="mt-1 text-sm text-slate-500">Administra las noticias publicadas en el sitio público.</p>
        </div>
        {allowedToWrite && <LinkButton href="/plataforma/noticias/nueva">Nueva noticia</LinkButton>}
      </div>

      <Card className="mt-6">
        <CardBody>
          {news.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {news.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500">
                      {n.category} · {n.author?.full_name ?? "—"}
                      {n.published_at && ` · ${formatDate(n.published_at)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge tone={n.published ? "success" : "neutral"}>{n.published ? "Publicada" : "No publicada"}</Badge>
                    {allowedToWrite && (
                      <>
                        <Link
                          href={`/plataforma/noticias/${n.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Editar ${n.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <ToggleNewsPublishedButton
                          newsId={n.id}
                          published={n.published}
                          title={n.title}
                          publishedAt={n.published_at}
                        />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Newspaper} title="Sin noticias" description="Crea la primera noticia para el sitio público." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
