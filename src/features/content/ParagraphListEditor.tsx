"use client";

import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/**
 * Editor controlado de una lista de párrafos (agregar/eliminar/reordenar)
 * -- usado por Historia (Nuestra Escuela) e Introducción (Proyecto
 * Educativo). El valor completo se guarda como array en `school_config`,
 * no hay tabla ni id por párrafo: por eso es un widget controlado simple,
 * no un CRUD contra la base de datos como `ContentCardsManager`.
 */
export function ParagraphListEditor({
  label,
  paragraphs,
  onChange,
}: {
  label: string;
  paragraphs: string[];
  onChange: (next: string[]) => void;
}) {
  function updateAt(index: number, value: string) {
    const next = [...paragraphs];
    next[index] = value;
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
      <div className="space-y-2">
        {paragraphs.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <Textarea value={p} onChange={(e) => updateAt(i, e.target.value)} rows={2} className="flex-1" />
            <div className="flex shrink-0 flex-col gap-1">
              <button type="button" disabled={i === 0} onClick={() => moveAt(i, -1)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Subir párrafo"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={i === paragraphs.length - 1} onClick={() => moveAt(i, 1)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Bajar párrafo"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => removeAt(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar párrafo"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => onChange([...paragraphs, ""])}>
        <Plus className="h-3.5 w-3.5" /> Agregar párrafo
      </Button>
    </div>
  );
}
