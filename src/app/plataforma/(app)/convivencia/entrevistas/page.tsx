import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, FileDown } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listAllInterviews } from "@/services/convivencia";
import { INTERVIEW_PARTICIPANT_LABELS } from "@/features/convivencia/labels";

export const metadata: Metadata = { title: "Entrevistas — Convivencia Educativa" };

export default async function EntrevistasPage() {
  const interviews = await listAllInterviews();

  return (
    <div>
      <p className="text-sm text-slate-500">Entrevistas registradas en todos los casos visibles. Se registran desde la ficha de cada caso.</p>

      <Card className="mt-4">
        <CardBody>
          {interviews.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {interviews.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/plataforma/convivencia/casos/${i.case_id}`} className="text-sm font-medium text-brand-700 hover:underline">
                      {i.case_folio}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {INTERVIEW_PARTICIPANT_LABELS[i.participant_type]}: {i.student_name ?? i.guardian_name ?? i.participant_other ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{formatDate(i.interview_date)}</span>
                    <Link
                      href={`/plataforma/api/convivencia/entrevistas/${i.id}/pdf`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                    >
                      <FileDown className="h-3.5 w-3.5" /> Acta PDF
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageSquare} title="Sin entrevistas" description="Las entrevistas se registran desde la ficha de cada caso." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
