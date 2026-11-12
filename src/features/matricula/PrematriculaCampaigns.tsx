"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, MessageCircle, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

export interface CampaignView {
  id: string;
  title: string;
  year: number;
  active: boolean;
  closesAt: string | null;
  url: string;
  requests: number;
  pending: number;
}

/** Crear campañas de pre-matrícula (una por año) y compartir su enlace público. */
export function PrematriculaCampaigns({
  years,
  defaultYearId,
  campaigns,
}: {
  years: { id: string; year: number }[];
  defaultYearId: string;
  campaigns: CampaignView[];
}) {
  const router = useRouter();
  const [yearId, setYearId] = useState(defaultYearId);
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [closes, setClose] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const yearNumber = years.find((y) => y.id === yearId)?.year ?? "";

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("prematricula_campaigns").insert({
      academic_year_id: yearId,
      title: title.trim() || `Pre-matrícula ${yearNumber}`,
      intro_text: intro.trim() || null,
      closes_at: closes ? new Date(`${closes}T23:59:59`).toISOString() : null,
      created_by: auth.user?.id,
      active: true,
    });
    setSaving(false);
    if (insertError) {
      setError("No se pudo crear la campaña.");
      return;
    }
    setTitle("");
    setIntro("");
    setClose("");
    router.refresh();
  }

  async function copy(c: CampaignView) {
    try {
      await navigator.clipboard.writeText(c.url);
      setCopied(c.id);
      setTimeout(() => setCopied((cur) => (cur === c.id ? null : cur)), 2000);
    } catch {
      window.prompt("Copia el enlace:", c.url);
    }
  }

  async function toggle(c: CampaignView) {
    setBusy(c.id);
    await createClient().from("prematricula_campaigns").update({ active: !c.active }).eq("id", c.id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Nueva campaña de pre-matrícula</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Año al que postulan" htmlFor="pm_year" required>
                <Select id="pm_year" value={yearId} onChange={(e) => setYearId(e.target.value)}>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>{y.year}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Título" htmlFor="pm_title" hint="Lo ve la familia arriba del formulario">
                <Input id="pm_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Pre-matrícula ${yearNumber}`} />
              </FormField>
              <FormField label="Cierra el (opcional)" htmlFor="pm_closes">
                <Input id="pm_closes" type="date" value={closes} onChange={(e) => setClose(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Mensaje de bienvenida (opcional)" htmlFor="pm_intro">
              <Textarea id="pm_intro" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Ej: Completa la ficha de tu hijo/a para postular al año escolar 2027." />
            </FormField>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="submit" size="sm" disabled={saving}>
              <Plus className="h-4 w-4" /> {saving ? "Creando…" : "Crear campaña y enlace"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    <Badge tone="brand">Año {c.year}</Badge>
                    <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Abierta" : "Cerrada"}</Badge>
                    {c.closesAt && <span className="text-xs text-slate-500">Cierra el {formatDate(c.closesAt)}</span>}
                  </div>
                  <span className="text-xs text-slate-500">
                    {c.requests} solicitud{c.requests === 1 ? "" : "es"} · {c.pending} por revisar
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-xs text-slate-700">{c.url}</code>
                  <button type="button" onClick={() => copy(c)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    {copied === c.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied === c.id ? "Copiado" : "Copiar enlace"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${c.title}: completa la ficha aquí ${c.url}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <ExternalLink className="h-3.5 w-3.5" /> Ver formulario
                  </a>
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    disabled={busy === c.id}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Power className="h-3.5 w-3.5" /> {c.active ? "Cerrar campaña" : "Reabrir campaña"}
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
