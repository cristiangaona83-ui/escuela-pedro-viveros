"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ParagraphListEditor } from "./ParagraphListEditor";
import { createClient } from "@/lib/supabase/client";
import type { ProyectoEducativoContent } from "@/services/school-config";

export function ProyectoEducativoContentForm({ content }: { content: ProyectoEducativoContent }) {
  const router = useRouter();
  const [introParagraphs, setIntroParagraphs] = useState(content.introParagraphs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const value: ProyectoEducativoContent = {
      introParagraphs: introParagraphs.map((p) => p.trim()).filter(Boolean),
    };

    const supabase = createClient();
    const { error: dbError } = await supabase.from("school_config").upsert({ key: "proyecto_educativo_content", value, is_public: true }, { onConflict: "key" });

    if (!dbError) {
      await supabase.rpc("log_audit", { p_action: "actualizar_contenido_sitio", p_module: "sitio-web", p_entity: "school_config", p_entity_id: "proyecto_educativo_content" });
    }

    setLoading(false);
    if (dbError) { setError("No pudimos guardar el contenido."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ParagraphListEditor label="Texto introductorio" paragraphs={introParagraphs} onChange={setIntroParagraphs} />
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Guardado.</div>}
      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
