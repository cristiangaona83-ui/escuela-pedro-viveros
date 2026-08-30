"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea } from "@/components/ui/Field";
import { AlignmentControl } from "@/components/ui/AlignmentControl";
import { ParagraphListEditor } from "./ParagraphListEditor";
import { createClient } from "@/lib/supabase/client";
import type { NuestraEscuelaContent } from "@/services/school-config";

export function NuestraEscuelaContentForm({ content }: { content: NuestraEscuelaContent }) {
  const router = useRouter();
  const [historyParagraphs, setHistoryParagraphs] = useState(content.historyParagraphs);
  const [missionAlign, setMissionAlign] = useState(content.missionAlign);
  const [visionAlign, setVisionAlign] = useState(content.visionAlign);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const value: NuestraEscuelaContent = {
      historyParagraphs: historyParagraphs.map((p) => ({ ...p, text: p.text.trim() })).filter((p) => p.text),
      mission: String(form.get("mission") || "").trim(),
      missionAlign,
      vision: String(form.get("vision") || "").trim(),
      visionAlign,
    };

    const supabase = createClient();
    const { error: dbError } = await supabase.from("school_config").upsert({ key: "nuestra_escuela_content", value, is_public: true }, { onConflict: "key" });

    if (!dbError) {
      await supabase.rpc("log_audit", { p_action: "actualizar_contenido_sitio", p_module: "sitio-web", p_entity: "school_config", p_entity_id: "nuestra_escuela_content" });
    }

    setLoading(false);
    if (dbError) { setError("No pudimos guardar el contenido."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ParagraphListEditor label="Historia y trayectoria" paragraphs={historyParagraphs} onChange={setHistoryParagraphs} />

      <div>
        <FormField label="Misión" htmlFor="mission" required>
          <Textarea id="mission" name="mission" rows={4} required defaultValue={content.mission} />
        </FormField>
        <AlignmentControl className="mt-2" value={missionAlign} onChange={setMissionAlign} />
      </div>
      <div>
        <FormField label="Visión" htmlFor="vision" required>
          <Textarea id="vision" name="vision" rows={4} required defaultValue={content.vision} />
        </FormField>
        <AlignmentControl className="mt-2" value={visionAlign} onChange={setVisionAlign} />
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Guardado.</div>}
      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
