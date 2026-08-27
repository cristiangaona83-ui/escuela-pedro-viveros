"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_CARD_ICON_OPTIONS, resolveContentCardIcon } from "@/config/content-icons";
import type { ContentCardRow, ContentCardSection } from "@/types/database";

type Draft = { title: string; description: string; icon: string; href: string };
const EMPTY_DRAFT: Draft = { title: "", description: "", icon: CONTENT_CARD_ICON_OPTIONS[0], href: "" };

function CardFields({ defaultValues, showIconHref }: { defaultValues?: Draft; showIconHref: boolean }) {
  return (
    <>
      <FormField label="Título" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} />
      </FormField>
      <FormField label="Descripción" htmlFor="description" required>
        <Textarea id="description" name="description" required rows={2} defaultValue={defaultValues?.description} />
      </FormField>
      {showIconHref && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ícono" htmlFor="icon" required>
            <Select id="icon" name="icon" defaultValue={defaultValues?.icon ?? CONTENT_CARD_ICON_OPTIONS[0]}>
              {CONTENT_CARD_ICON_OPTIONS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Enlace" htmlFor="href" hint="Ej: /proyecto-educativo">
            <Input id="href" name="href" defaultValue={defaultValues?.href} />
          </FormField>
        </div>
      )}
    </>
  );
}

/**
 * Lista + alta/edición/eliminación/reordenar/mostrar-ocultar para una
 * sección de `content_cards`. `showIconHref` solo se activa para
 * 'inicio_destacados' -- Sellos y Valores no llevan ícono ni enlace.
 */
export function ContentCardsManager({
  section,
  initialCards,
  showIconHref,
  auditLabel,
}: {
  section: ContentCardSection;
  initialCards: ContentCardRow[];
  showIconHref: boolean;
  auditLabel: string;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.from("content_cards").select("*").eq("section", section).order("order_index", { ascending: true });
    if (data) setCards(data);
    router.refresh();
  }

  async function handleSave(event: FormEvent<HTMLFormElement>, editId: string | null) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const icon = showIconHref ? String(form.get("icon") || "") : null;
    const href = showIconHref ? String(form.get("href") || "").trim() || null : null;

    if (!title || !description) {
      setLoading(false);
      setError("Completa título y descripción.");
      return;
    }

    const supabase = createClient();
    const payload = { section, title, description, icon, href };
    const { error: dbError } = editId
      ? await supabase.from("content_cards").update(payload).eq("id", editId)
      : await supabase.from("content_cards").insert({ ...payload, order_index: cards.length });

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar la tarjeta.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: editId ? "actualizar_tarjeta" : "crear_tarjeta",
      p_module: "sitio-web",
      p_entity: "content_cards",
      p_entity_id: editId ?? undefined,
      p_details: { section, title },
    });

    setLoading(false);
    setEditingId(null);
    setShowNewForm(false);
    await refresh();
  }

  async function handleDelete(card: ContentCardRow) {
    if (!window.confirm(`¿Eliminar "${card.title}" de ${auditLabel}?`)) return;
    setLoading(true);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("content_cards").delete().eq("id", card.id);
    if (dbError) {
      setLoading(false);
      window.alert("No pudimos eliminar la tarjeta.");
      return;
    }
    await supabase.rpc("log_audit", { p_action: "eliminar_tarjeta", p_module: "sitio-web", p_entity: "content_cards", p_entity_id: card.id, p_details: { section, title: card.title } });
    setLoading(false);
    await refresh();
  }

  async function handleToggleActive(card: ContentCardRow) {
    setLoading(true);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("content_cards").update({ active: !card.active }).eq("id", card.id);
    if (dbError) {
      setLoading(false);
      window.alert("No pudimos cambiar la visibilidad.");
      return;
    }
    await supabase.rpc("log_audit", { p_action: card.active ? "ocultar_tarjeta" : "mostrar_tarjeta", p_module: "sitio-web", p_entity: "content_cards", p_entity_id: card.id, p_details: { section, title: card.title } });
    setLoading(false);
    await refresh();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    setLoading(true);
    const a = cards[index];
    const b = cards[targetIndex];
    const supabase = createClient();
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("content_cards").update({ order_index: b.order_index }).eq("id", a.id),
      supabase.from("content_cards").update({ order_index: a.order_index }).eq("id", b.id),
    ]);
    if (e1 || e2) {
      setLoading(false);
      window.alert("No pudimos reordenar.");
      return;
    }
    setLoading(false);
    await refresh();
  }

  return (
    <div>
      {cards.length === 0 && !showNewForm ? (
        <EmptyState icon={Plus} title="Sin tarjetas" description="Agrega la primera." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {cards.map((card, i) => {
            const Icon = showIconHref ? resolveContentCardIcon(card.icon) : null;
            const isEditing = editingId === card.id;
            return (
              <li key={card.id} className="py-3">
                {isEditing ? (
                  <form onSubmit={(e) => handleSave(e, card.id)} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <CardFields showIconHref={showIconHref} defaultValues={{ title: card.title, description: card.description, icon: card.icon ?? CONTENT_CARD_ICON_OPTIONS[0], href: card.href ?? "" }} />
                    {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={loading}><Save className="h-3.5 w-3.5" /> Guardar</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingId(null); setError(null); }}><X className="h-3.5 w-3.5" /> Cancelar</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {Icon && (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{card.title}</p>
                        <p className="truncate text-xs text-slate-500">{card.description}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={card.active ? "success" : "neutral"}>{card.active ? "Visible" : "Oculto"}</Badge>
                      <button type="button" disabled={loading || i === 0} onClick={() => handleMove(i, -1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" disabled={loading || i === cards.length - 1} onClick={() => handleMove(i, 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Bajar"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" disabled={loading} onClick={() => handleToggleActive(card)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={card.active ? "Ocultar" : "Mostrar"}>
                        {card.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button type="button" disabled={loading} onClick={() => { setEditingId(card.id); setError(null); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                      <button type="button" disabled={loading} onClick={() => handleDelete(card)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showNewForm ? (
        <form onSubmit={(e) => handleSave(e, null)} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <CardFields showIconHref={showIconHref} defaultValues={EMPTY_DRAFT} />
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}><Save className="h-3.5 w-3.5" /> Agregar</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => { setShowNewForm(false); setError(null); }}><X className="h-3.5 w-3.5" /> Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button type="button" size="sm" variant="secondary" className="mt-4" onClick={() => { setShowNewForm(true); setEditingId(null); setError(null); }}>
          <Plus className="h-4 w-4" /> Agregar tarjeta
        </Button>
      )}
    </div>
  );
}
