"use client";

import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { AlignmentControl } from "@/components/ui/AlignmentControl";
import type { AlignedText, Align } from "@/lib/content-align";

/**
 * Editor controlado de una lista de párrafos (agregar/eliminar/reordenar,
 * cada uno con su propia alineación) -- usado por Historia (Nuestra
 * Escuela), Introducción (Proyecto Educativo) y los párrafos de Admisión
 * (Inicio). El valor completo se guarda como array en `school_config`, no
 * hay tabla ni id por párrafo: por eso es un widget controlado simple, no
 * un CRUD contra la base de datos como `ContentCardsManager`.
 */
export function ParagraphListEditor({
  label,
  paragraphs,
  onChange,
}: {
  label: string;
  paragraphs: AlignedText[];
  onChange: (next: AlignedText[]) => void;
}) {
  function updateText(index: number, text: string) {
    const next = [...paragraphs];
    next[index] = { ...next[index], text };
    onChange(next);
  }
  function updateAlign(index: number, align: Align) {
    const next = [...paragraphs];
    next[index] = { ...next[index], align };
    onChange(next);
  }
  function removeAt(index: number) {
    onChange(paragraphs.filter((_, i) => i !== index));
  }
  function moveAt(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= paragraphs.length) return;
    const next = [...paragraphs];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate-700">{label}</p>
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2">
            <Textarea value={p.text} onChange={(e) => updateText(i, e.target.value)} rows={2} className="flex-1" />
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <AlignmentControl label={null} value={p.align} onChange={(align) => updateAlign(i, align)} />
              <div className="flex gap-1">
                <button type="button" disabled={i === 0} onClick={() => moveAt(i, -1)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Subir párrafo"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={i === paragraphs.length - 1} onClick={() => moveAt(i, 1)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Bajar párrafo"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => removeAt(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar párrafo"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => onChange([...paragraphs, { text: "", align: "left" }])}>
        <Plus className="h-3.5 w-3.5" /> Agregar párrafo
      </Button>
    </div>
  );
}
