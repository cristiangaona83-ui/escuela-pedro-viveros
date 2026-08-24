"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { Save, Send, Eye, Pencil, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Card, CardBody } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { BulletinEditor } from "./BulletinEditor";
import { publishBulletin } from "./publish-bulletin";
import { BulletinContent } from "@/components/public/BulletinContent";
import { STARTER_BULLETIN_CONTENT, formatBulletinDate } from "@/lib/bulletin-content";
import type { WeeklyBulletinRow } from "@/types/database";

export function BulletinForm({ bulletin, suggestedNumber }: { bulletin?: WeeklyBulletinRow; suggestedNumber?: number }) {
  const router = useRouter();
  const isEdit = Boolean(bulletin);

  const [number, setNumber] = useState(bulletin?.number ?? suggestedNumber ?? 1);
  const [title, setTitle] = useState(bulletin?.title ?? `Informativo Semanal N.º ${bulletin?.number ?? suggestedNumber ?? 1}`);
  const [weekLabel, setWeekLabel] = useState(bulletin?.week_label ?? "");
  const [publishDate, setPublishDate] = useState(bulletin?.publish_date ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState<JSONContent>((bulletin?.content as JSONContent) ?? STARTER_BULLETIN_CONTENT);

  const [mode, setMode] = useState<"editar" | "preview">("editar");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(): Promise<string | null> {
    if (!title.trim()) {
      setError("Ingresa un título.");
      return null;
    }
    if (!weekLabel.trim()) {
      setError("Ingresa la semana correspondiente (ej: Semana del 24 al 28 de agosto de 2026).");
      return null;
    }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    const payload = {
      number,
      title: title.trim(),
      week_label: weekLabel.trim(),
      publish_date: publishDate,
      content,
      created_by: bulletin?.created_by ?? authData.user?.id,
    };

    if (isEdit) {
      const { error: dbError } = await supabase.from("weekly_bulletins").update(payload).eq("id", bulletin!.id);
      if (dbError) {
        setError(dbError.code === "23505" ? "Ya existe un informativo con ese número." : "No pudimos guardar el informativo.");
        return null;
      }
      await supabase.rpc("log_audit", {
        p_action: "actualizar_informativo",
        p_module: "informativos",
        p_entity: "weekly_bulletins",
        p_entity_id: bulletin!.id,
        p_details: { number, title: payload.title },
      });
      return bulletin!.id;
    }

    const { data: inserted, error: dbError } = await supabase.from("weekly_bulletins").insert(payload).select("id").single();
    if (dbError || !inserted) {
      setError(dbError?.code === "23505" ? "Ya existe un informativo con ese número." : "No pudimos guardar el informativo.");
      return null;
    }
    await supabase.rpc("log_audit", {
      p_action: "crear_informativo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: inserted.id,
      p_details: { number, title: payload.title },
    });
    return inserted.id;
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    setError(null);
    const id = await persist();
    setSavingDraft(false);
    if (!id) return;
    if (isEdit) {
      router.refresh();
    } else {
      router.push(`/plataforma/informativos/${id}`);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    const id = await persist();
    if (!id) {
      setPublishing(false);
      return;
    }
    const result = await publishBulletin(id);
    setPublishing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/plataforma/informativos");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("editar")}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "editar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Eye className="h-3.5 w-3.5" /> Vista previa
        </button>
      </div>

      {mode === "editar" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <FormField label="N.º" htmlFor="number" required hint="Sugerido automáticamente">
              <Input id="number" type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} required />
            </FormField>
            <FormField label="Título" htmlFor="title" required>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Semana correspondiente" htmlFor="week_label" required hint="Ej: Semana del 24 al 28 de agosto de 2026">
              <Input id="week_label" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} required />
            </FormField>
            <FormField label="Fecha de publicación" htmlFor="publish_date" required>
              <Input id="publish_date" type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} required />
            </FormField>
          </div>

          <FormField label="Contenido" htmlFor="content" hint="Usa las secciones sugeridas o escribe libremente — puedes borrar las que no necesites.">
            <BulletinEditor content={content} onChange={setContent} />
          </FormField>
        </div>
      ) : (
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Vista previa</p>
            <h2 className="mt-2 font-heading text-xl font-medium text-slate-900">Informativo Semanal N.º {number || "—"}</h2>
            <p className="text-sm font-medium text-brand-700">{title}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {weekLabel || "Semana sin definir"} · {publishDate ? formatBulletinDate(publishDate) : "—"}
            </p>
            <div className="mt-6 border-t border-slate-100 pt-6">
              <BulletinContent content={content} />
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={savingDraft || publishing} onClick={handleSaveDraft}>
          <Save className="h-4 w-4" /> {savingDraft ? "Guardando…" : "Guardar borrador"}
        </Button>
        <Button type="button" size="sm" disabled={savingDraft || publishing} onClick={handlePublish}>
          <Send className="h-4 w-4" /> {publishing ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </div>
  );
}
