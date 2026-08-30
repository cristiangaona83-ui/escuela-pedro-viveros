import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { BulletinForm } from "@/features/weekly-bulletins/BulletinForm";
import { DuplicateBulletinButton } from "@/features/weekly-bulletins/DuplicateBulletinButton";
import { DeleteBulletinButton } from "@/features/weekly-bulletins/DeleteBulletinButton";
import { EmailScheduleCard } from "@/features/weekly-bulletins/EmailScheduleCard";
import { BulletinPrintPanel } from "@/features/weekly-bulletins/BulletinPrintPanel";
import { getBulletinById, getBulletinEmailSummary } from "@/services/weekly-bulletins-admin";
import { getActiveRecipientCount } from "@/services/bulletin-recipients-admin";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Editar informativo" };

const WRITE_ROLES = ["director", "utp", "superadmin"] as const;

export default async function EditarInformativoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bulletin, session] = await Promise.all([getBulletinById(id), getSessionContext()]);

  if (!bulletin) notFound();
  if (!canWrite(session?.roles ?? [], [...WRITE_ROLES])) redirect("/plataforma/informativos");

  const [activeRecipientCount, emailSummary] = bulletin.published
    ? await Promise.all([getActiveRecipientCount(), getBulletinEmailSummary(bulletin.id)])
    : [0, null];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Editar informativo</h1>
        <div className="flex items-center gap-1.5">
          {bulletin.pdf_url && (
            <a
              href={`/api/informativos/${bulletin.number}/pdf`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Download className="h-3.5 w-3.5" /> Descargar PDF
            </a>
          )}
          <DuplicateBulletinButton bulletin={bulletin} />
          <DeleteBulletinButton bulletinId={bulletin.id} title={bulletin.title} pdfUrl={bulletin.pdf_url} redirectTo="/plataforma/informativos" />
        </div>
      </div>

      <div className="mt-4">
        <BulletinPrintPanel bulletinId={bulletin.id} />
      </div>

      {bulletin.published && (
        <div className="mt-6">
          <EmailScheduleCard
            bulletinId={bulletin.id}
            bulletinNumber={bulletin.number}
            emailScheduledAt={bulletin.email_scheduled_at}
            emailSentAt={bulletin.email_sent_at}
            activeRecipientCount={activeRecipientCount}
            sentSummary={emailSummary}
          />
        </div>
      )}

      <Card className="mt-6">
        <CardBody>
          <BulletinForm bulletin={bulletin} />
        </CardBody>
      </Card>
    </div>
  );
}
