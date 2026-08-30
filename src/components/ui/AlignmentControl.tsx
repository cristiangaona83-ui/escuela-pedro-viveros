import { AlignLeft, AlignCenter, AlignRight, AlignJustify, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALIGN_LABEL, type Align } from "@/lib/content-align";

const OPTIONS: { value: Align; icon: LucideIcon }[] = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
  { value: "justify", icon: AlignJustify },
];

const SIZE_CLASS = { sm: "h-7 w-7", md: "h-8 w-8" };
const ICON_SIZE_CLASS = { sm: "h-3.5 w-3.5", md: "h-4 w-4" };

/**
 * Control único de alineación (izquierda/centro/derecha/justificar),
 * reutilizado en todo Admin Web -- tanto para campos de texto plano
 * (value/onChange controlado por el formulario) como, en los editores
 * TipTap, envuelto por el propio componente del editor para leer/escribir
 * `editor.chain().setTextAlign()`. No duplicar este bloque de botones en
 * ningún formulario o toolbar nuevo.
 */
export function AlignmentControl({
  value,
  onChange,
  label = "Alineación",
  size = "sm",
  className,
}: {
  value: Align;
  onChange: (align: Align) => void;
  /** `null` para omitir la etiqueta (ej. dentro de una toolbar que ya tiene su propio rótulo visual). */
  label?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>}
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
        {OPTIONS.map(({ value: optionValue, icon: Icon }) => {
          const active = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              title={ALIGN_LABEL[optionValue]}
              aria-label={ALIGN_LABEL[optionValue]}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                SIZE_CLASS[size],
                active && "bg-brand-50 text-brand-700"
              )}
            >
              <Icon className={ICON_SIZE_CLASS[size]} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
