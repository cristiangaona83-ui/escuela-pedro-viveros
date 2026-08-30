/**
 * Alineación de texto reutilizable en todo el Admin Web (CMS del sitio
 * público) -- una sola fuente de verdad para el tipo, el mapa de clases
 * Tailwind (nunca `text-${align}` dinámico: Tailwind no detectaría la clase
 * en el build) y la normalización de valores guardados/legados.
 */
export type Align = "left" | "center" | "right" | "justify";

export const ALIGN_VALUES: readonly Align[] = ["left", "center", "right", "justify"];

export const ALIGN_LABEL: Record<Align, string> = {
  left: "Alinear a la izquierda",
  center: "Centrar",
  right: "Alinear a la derecha",
  justify: "Justificar",
};

/** Mapa explícito -- Tailwind escanea el código fuente en busca de nombres de clase literales, así que una clase armada en runtime (`text-${align}`) puede quedar fuera del CSS generado. */
export const ALIGN_CLASS: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

export function isAlign(value: unknown): value is Align {
  return typeof value === "string" && (ALIGN_VALUES as readonly string[]).includes(value);
}

export function normalizeAlign(value: unknown, fallback: Align): Align {
  return isAlign(value) ? value : fallback;
}

export interface AlignedText {
  text: string;
  align: Align;
}

/**
 * Acepta tanto el formato legado (`string[]`) como el nuevo (`{text,
 * align}[]`) y siempre normaliza al nuevo -- así ningún contenido antiguo
 * se rompe. `legacyAlign` es la alineación que ese campo ya usaba
 * visualmente antes de esta función existir (ej. "justify" si el bloque
 * tenía `text-justify` fijo), NO un valor arbitrario: preserva la
 * apariencia actual de contenido no editado.
 */
export function normalizeParagraphs(value: unknown, legacyAlign: Align): AlignedText[] {
  if (!Array.isArray(value)) return [];
  return value.map((item): AlignedText => {
    if (typeof item === "string") return { text: item, align: legacyAlign };
    if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
      const obj = item as { text: string; align?: unknown };
      return { text: obj.text, align: normalizeAlign(obj.align, legacyAlign) };
    }
    return { text: "", align: legacyAlign };
  });
}
