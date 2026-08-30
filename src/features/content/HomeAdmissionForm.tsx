"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { AlignmentControl } from "@/components/ui/AlignmentControl";
import { ParagraphListEditor } from "./ParagraphListEditor";
import { createClient } from "@/lib/supabase/client";
import type { HomeAdmissionContent } from "@/services/school-config";

export function HomeAdmissionForm({ content }: { content: HomeAdmissionContent }) {
  const router = useRouter();
  const [saeParagraphs, setSaeParagraphs] = useState(content.sae.paragraphs);
  const [vacantesParagraphs, setVacantesParagraphs] = useState(content.vacantes.paragraphs);
  const [saeBadgeAlign, setSaeBadgeAlign] = useState(content.sae.badgeAlign);
  const [saeTitleAlign, setSaeTitleAlign] = useState(content.sae.titleAlign);
  const [saeDeadlineAlign, setSaeDeadlineAlign] = useState(content.sae.deadlineLabelAlign);
  const [saeCtaBoxTitleAlign, setSaeCtaBoxTitleAlign] = useState(content.sae.ctaBoxTitleAlign);
  const [saeCtaBoxTextAlign, setSaeCtaBoxTextAlign] = useState(content.sae.ctaBoxTextAlign);
  const [vacBadgeAlign, setVacBadgeAlign] = useState(content.vacantes.badgeAlign);
  const [vacTitleAlign, setVacTitleAlign] = useState(content.vacantes.titleAlign);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const str = (name: string) => String(form.get(name) || "").trim();

    const value: HomeAdmissionContent = {
      sae: {
        badge: str("sae_badge"),
        badgeAlign: saeBadgeAlign,
        title: str("sae_title"),
        titleAlign: saeTitleAlign,
        paragraphs: saeParagraphs.map((p) => ({ ...p, text: p.text.trim() })).filter((p) => p.text),
        deadlineLabel: str("sae_deadline"),
        deadlineLabelAlign: saeDeadlineAlign,
        ctaBoxTitle: str("sae_ctaBoxTitle"),
        ctaBoxTitleAlign: saeCtaBoxTitleAlign,
        ctaBoxText: str("sae_ctaBoxText"),
        ctaBoxTextAlign: saeCtaBoxTextAlign,
        ctaText: str("sae_ctaText"),
        ctaHref: str("sae_ctaHref"),
      },
      vacantes: {
        badge: str("vac_badge"),
        badgeAlign: vacBadgeAlign,
        title: str("vac_title"),
        titleAlign: vacTitleAlign,
        paragraphs: vacantesParagraphs.map((p) => ({ ...p, text: p.text.trim() })).filter((p) => p.text),
        ctaText: str("vac_ctaText"),
        ctaHref: str("vac_ctaHref"),
      },
    };

    const supabase = createClient();
    const { error: dbError } = await supabase.from("school_config").upsert({ key: "home_admission", value, is_public: true }, { onConflict: "key" });

    if (!dbError) {
      await supabase.rpc("log_audit", { p_action: "actualizar_contenido_sitio", p_module: "sitio-web", p_entity: "school_config", p_entity_id: "home_admission" });
    }

    setLoading(false);
    if (dbError) { setError("No pudimos guardar el contenido."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Bloque principal — Postulación SAE</h3>
        <div className="mt-3 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormField label="Etiqueta (badge)" htmlFor="sae_badge" required hint='Ej: "Admisión 2027"'>
                <Input id="sae_badge" name="sae_badge" required defaultValue={content.sae.badge} />
              </FormField>
              <AlignmentControl className="mt-2" value={saeBadgeAlign} onChange={setSaeBadgeAlign} />
            </div>
            <div>
              <FormField label="Título" htmlFor="sae_title" required>
                <Input id="sae_title" name="sae_title" required defaultValue={content.sae.title} />
              </FormField>
              <AlignmentControl className="mt-2" value={saeTitleAlign} onChange={setSaeTitleAlign} />
            </div>
          </div>
          <ParagraphListEditor label="Párrafos" paragraphs={saeParagraphs} onChange={setSaeParagraphs} />
          <div>
            <FormField label="Plazo / fecha límite" htmlFor="sae_deadline" required hint='Se muestra destacado. Ej: "Plazo hasta el jueves 27 de agosto a las 14:00 horas"'>
              <Input id="sae_deadline" name="sae_deadline" required defaultValue={content.sae.deadlineLabel} />
            </FormField>
            <AlignmentControl className="mt-2" value={saeDeadlineAlign} onChange={setSaeDeadlineAlign} />
          </div>
          <div>
            <FormField label="Título del recuadro de postulación" htmlFor="sae_ctaBoxTitle" required>
              <Input id="sae_ctaBoxTitle" name="sae_ctaBoxTitle" required defaultValue={content.sae.ctaBoxTitle} />
            </FormField>
            <AlignmentControl className="mt-2" value={saeCtaBoxTitleAlign} onChange={setSaeCtaBoxTitleAlign} />
          </div>
          <div>
            <FormField label="Texto del recuadro de postulación" htmlFor="sae_ctaBoxText" required>
              <Input id="sae_ctaBoxText" name="sae_ctaBoxText" required defaultValue={content.sae.ctaBoxText} />
            </FormField>
            <AlignmentControl className="mt-2" value={saeCtaBoxTextAlign} onChange={setSaeCtaBoxTextAlign} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Texto del botón" htmlFor="sae_ctaText" required>
              <Input id="sae_ctaText" name="sae_ctaText" required defaultValue={content.sae.ctaText} />
            </FormField>
            <FormField label="Enlace del botón" htmlFor="sae_ctaHref" required>
              <Input id="sae_ctaHref" name="sae_ctaHref" type="url" required defaultValue={content.sae.ctaHref} />
            </FormField>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-800">Bloque secundario — Vacantes</h3>
        <div className="mt-3 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormField label="Etiqueta (badge)" htmlFor="vac_badge" required hint='Ej: "Vacantes 2026"'>
                <Input id="vac_badge" name="vac_badge" required defaultValue={content.vacantes.badge} />
              </FormField>
              <AlignmentControl className="mt-2" value={vacBadgeAlign} onChange={setVacBadgeAlign} />
            </div>
            <div>
              <FormField label="Título" htmlFor="vac_title" required>
                <Input id="vac_title" name="vac_title" required defaultValue={content.vacantes.title} />
              </FormField>
              <AlignmentControl className="mt-2" value={vacTitleAlign} onChange={setVacTitleAlign} />
            </div>
          </div>
          <ParagraphListEditor label="Párrafos" paragraphs={vacantesParagraphs} onChange={setVacantesParagraphs} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Texto del botón" htmlFor="vac_ctaText" required>
              <Input id="vac_ctaText" name="vac_ctaText" required defaultValue={content.vacantes.ctaText} />
            </FormField>
            <FormField label="Enlace del botón" htmlFor="vac_ctaHref" required>
              <Input id="vac_ctaHref" name="vac_ctaHref" type="url" required defaultValue={content.vacantes.ctaHref} />
            </FormField>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Guardado.</div>}
      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
