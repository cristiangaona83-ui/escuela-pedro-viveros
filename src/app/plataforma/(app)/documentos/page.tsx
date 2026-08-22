import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { DocumentForm } from "@/features/documents/DocumentForm";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosPlataformaPage() {
  const supabase = await createClient();
  const { data: documents } = await supabase.from("documents").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Documentos</h1>
      <p className="mt-1 text-sm text-slate-500">Publica PEI, Reglamento Interno, protocolos y circulares. Marca cuáles son públicos.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardBody>
            {documents && documents.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.title}</p>
                      <p className="text-xs text-slate-500">{d.category}{d.year ? ` · ${d.year}` : ""}</p>
                    </div>
                    <Badge tone={d.is_public ? "success" : "neutral"}>{d.is_public ? "Público" : "Interno"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FolderOpen} title="Sin documentos" description="Publica el primer documento institucional." />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-slate-900">Nuevo documento</h2>
            <div className="mt-4"><DocumentForm /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
