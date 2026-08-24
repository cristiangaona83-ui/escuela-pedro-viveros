import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ArrowLeft } from "lucide-react";
import { BulletinContent } from "@/components/public/BulletinContent";
import { formatBulletinDate } from "@/lib/bulletin-content";
import { getPublishedBulletinByNumber } from "@/services/public-content";
import type { JSONContent } from "@tiptap/core";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const bulletin = await getPublishedBulletinByNumber(Number(number));
  if (!bulletin) return { title: "Informativo Semanal" };
  return { title: `Informativo Semanal N.º ${bulletin.number}`, description: bulletin.week_label };
}

export default async function InformativoDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const parsedNumber = Number(number);
  if (!Number.isInteger(parsedNumber)) notFound();

  const bulletin = await getPublishedBulletinByNumber(parsedNumber);
  if (!bulletin) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <Link href="/documentos" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" /> Volver a Documentos
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
            Informativo Semanal N.º {bulletin.number}
          </h1>
          <p className="mt-1 text-sm font-medium text-brand-700">{bulletin.title}</p>
          <p className="mt-1 text-sm text-slate-500">
            {bulletin.week_label} · {formatBulletinDate(bulletin.publish_date)}
          </p>
        </div>
        {bulletin.pdf_url && (
          <a
            href={`/api/informativos/${bulletin.number}/pdf`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 px-3.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            <Download className="h-4 w-4" /> Descargar PDF
          </a>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <BulletinContent content={bulletin.content as JSONContent} />
      </div>
    </article>
  );
}
