import type { Extensions, JSONContent } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";

/** Tamaños de fuente permitidos en el editor — lista cerrada a propósito
 * (no un selector libre) para mantener consistencia institucional. */
export const ALLOWED_FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24] as const;

export const ALLOWED_ALIGNMENTS = ["left", "center", "right", "justify"] as const;
export type BulletinAlignment = (typeof ALLOWED_ALIGNMENTS)[number];

declare module "@tiptap/extension-text-style" {
  interface TextStyleAttributes {
    fontSize?: string | null;
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/** Extensión propia de tamaño de fuente sobre la marca `textStyle` — Tiptap
 * no publica una versión estable de `@tiptap/extension-font-size` para esta
 * versión del core, así que se replica el mismo patrón que usan sus propias
 * extensiones Color/FontFamily (una marca "textStyle" con un atributo más). */
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});

/** Celdas de tabla con color de fondo opcional — Tiptap no lo incluye por
 * defecto; se agrega el mismo atributo a tableCell y tableHeader. */
const BulletinTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: { backgroundColor?: string | null }) => {
          if (!attributes.backgroundColor) return {};
          return { style: `background-color: ${attributes.backgroundColor}` };
        },
      },
    };
  },
});

const BulletinTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: { backgroundColor?: string | null }) => {
          if (!attributes.backgroundColor) return {};
          return { style: `background-color: ${attributes.backgroundColor}` };
        },
      },
    };
  },
});

/**
 * Extensiones del editor de Informativos Semanales — un set amplio, similar
 * a las funciones más usadas de Word, pero cerrado a lo que realmente se
 * pidió (sin código, citas ni tipografías arbitrarias — se conserva la
 * fuente institucional). Se comparten entre el editor (BulletinEditor) y el
 * renderizador de solo lectura para que la vista previa, la web pública y el
 * PDF interpreten siempre el mismo contenido de la misma forma.
 */
export const BULLETIN_EXTENSIONS: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    blockquote: false,
  }),
  Underline,
  TextStyle,
  Color,
  FontSize,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "left" }),
  Subscript,
  Superscript,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),
  Table.configure({ resizable: false }),
  TableRow,
  BulletinTableHeader,
  BulletinTableCell,
];

export const EMPTY_BULLETIN_CONTENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/** Secciones sugeridas (opcionales) para un informativo nuevo — el usuario
 * puede borrar las que no necesite o escribir contenido libre. */
export const BULLETIN_STARTER_SECTIONS = [
  "Información general",
  "Actividades de la semana",
  "Fechas importantes",
  "Reuniones",
  "Salidas pedagógicas",
  "Convivencia educativa",
  "Recordatorios",
  "Reconocimientos",
];

export const STARTER_BULLETIN_CONTENT: JSONContent = {
  type: "doc",
  content: BULLETIN_STARTER_SECTIONS.flatMap((label) => [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: label }] },
    { type: "paragraph" },
  ]),
};

// -----------------------------------------------------------------------------
// Validación de atributos — controla qué puede llegar a renderizarse como HTML
// o como estilo de PDF, sin depender de que el editor siempre produzca datos
// limpios (defensa en profundidad para SSR: nunca confiar ciegamente en el
// JSON guardado).
// -----------------------------------------------------------------------------

export function isSafeColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function safeAlignment(value: unknown): BulletinAlignment {
  return typeof value === "string" && (ALLOWED_ALIGNMENTS as readonly string[]).includes(value)
    ? (value as BulletinAlignment)
    : "left";
}

export function safeFontSizePx(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = parseInt(value, 10);
  return (ALLOWED_FONT_SIZES as readonly number[]).includes(parsed) ? parsed : null;
}

/** Solo http(s), mailto o rutas relativas del propio sitio — nunca `javascript:`, `data:` u otros esquemas. */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^(https?:\/\/|mailto:|\/)/i.test(value.trim());
}

/**
 * Formatea una fecha "solo fecha" (columna `date`, ej. "2026-08-24") sin el
 * corrimiento de un día que produce `new Date("2026-08-24")`: esa forma la
 * interpreta como medianoche UTC y luego `Intl.DateTimeFormat` la muestra en
 * la zona horaria local del servidor — en un servidor con offset negativo
 * (como Chile) el 24 se ve como 23. Se arma la fecha con año/mes/día locales
 * en vez de parsear el string completo.
 */
export function formatBulletinDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

const FILENAME_STOPWORDS = new Set(["de", "del", "la", "el"]);

/** Nombre de archivo legible para descargar el PDF — nunca el UUID interno
 * ni la ruta técnica de Storage, para que las familias vean algo como
 * "Informativo-Semanal-N24-24-al-28-agosto-2026", no un nombre críptico. */
export function bulletinFileBaseName(bulletin: { number: number; week_label: string }): string {
  const weekSlug = bulletin.week_label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^semana\s+(del\s+)?/, "")
    .split(/\s+/)
    .filter((word) => word && !FILENAME_STOPWORDS.has(word))
    .join("-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `Informativo-Semanal-N${bulletin.number}${weekSlug ? `-${weekSlug}` : ""}`;
}

// -----------------------------------------------------------------------------
// Renderizador de solo lectura → HTML
// -----------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineHTML(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type !== "text" || !node.text) return "";
      let html = escapeHtml(node.text);
      const marks = node.marks ?? [];
      const has = (type: string) => marks.some((m) => m.type === type);

      if (has("subscript")) html = `<sub>${html}</sub>`;
      if (has("superscript")) html = `<sup>${html}</sup>`;
      if (has("bold")) html = `<strong>${html}</strong>`;
      if (has("italic")) html = `<em>${html}</em>`;
      if (has("underline")) html = `<u>${html}</u>`;
      if (has("strike")) html = `<s>${html}</s>`;

      const textStyleMark = marks.find((m) => m.type === "textStyle");
      const styleParts: string[] = [];
      if (isSafeColor(textStyleMark?.attrs?.color)) styleParts.push(`color:${textStyleMark!.attrs!.color}`);
      const fontSizePx = safeFontSizePx(textStyleMark?.attrs?.fontSize);
      if (fontSizePx) styleParts.push(`font-size:${fontSizePx}px`);
      if (styleParts.length) html = `<span style="${styleParts.join(";")}">${html}</span>`;

      const highlightMark = marks.find((m) => m.type === "highlight");
      if (highlightMark) {
        const hlColor = highlightMark.attrs?.color;
        html = `<mark${isSafeColor(hlColor) ? ` style="background-color:${hlColor}"` : ""}>${html}</mark>`;
      }

      const linkMark = marks.find((m) => m.type === "link");
      const href = linkMark?.attrs?.href;
      if (isSafeUrl(href)) {
        html = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${html}</a>`;
      }
      return html;
    })
    .join("");
}

function renderListItemsHTML(items: JSONContent[] | undefined): string {
  return (items ?? []).map((item) => `<li>${renderBlocksHTML(item.content)}</li>`).join("");
}

function renderTableCellHTML(cell: JSONContent): string {
  const tag = cell.type === "tableHeader" ? "th" : "td";
  const attrs: string[] = [];
  const colspan = typeof cell.attrs?.colspan === "number" ? cell.attrs.colspan : 1;
  const rowspan = typeof cell.attrs?.rowspan === "number" ? cell.attrs.rowspan : 1;
  if (colspan > 1) attrs.push(`colspan="${colspan}"`);
  if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`);
  if (isSafeColor(cell.attrs?.backgroundColor)) attrs.push(`style="background-color:${cell.attrs!.backgroundColor}"`);
  return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>${renderBlocksHTML(cell.content)}</${tag}>`;
}

function renderTableHTML(node: JSONContent): string {
  const rows = (node.content ?? [])
    .map((row) => `<tr>${(row.content ?? []).map(renderTableCellHTML).join("")}</tr>`)
    .join("");
  return `<div class="bulletin-table-wrap"><table>${rows}</table></div>`;
}

function renderBlocksHTML(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const level = [1, 2, 3].includes(node.attrs?.level) ? node.attrs!.level : 2;
          const align = safeAlignment(node.attrs?.textAlign);
          return `<h${level}${align !== "left" ? ` style="text-align:${align}"` : ""}>${renderInlineHTML(node.content)}</h${level}>`;
        }
        case "paragraph": {
          if (!node.content) return "";
          const align = safeAlignment(node.attrs?.textAlign);
          return `<p${align !== "left" ? ` style="text-align:${align}"` : ""}>${renderInlineHTML(node.content)}</p>`;
        }
        case "bulletList":
          return `<ul>${renderListItemsHTML(node.content)}</ul>`;
        case "orderedList":
          return `<ol>${renderListItemsHTML(node.content)}</ol>`;
        case "table":
          return renderTableHTML(node);
        case "horizontalRule":
          return "<hr>";
        default:
          return "";
      }
    })
    .join("");
}

/**
 * HTML de solo lectura a partir del JSON del editor — renderizador propio,
 * sin depender de `generateHTML` de Tiptap (esa función necesita un DOM real
 * vía ProseMirror/DOMSerializer y falla en el servidor de Next.js, donde no
 * existe `window`; la página pública del informativo se renderiza en el
 * servidor). Solo interpreta los nodos de BULLETIN_EXTENSIONS, escapa todo el
 * texto y valida cada atributo de estilo antes de emitirlo, por lo que es
 * seguro insertar el resultado con dangerouslySetInnerHTML. Se usa tanto en
 * la vista previa dentro de la plataforma como en la página pública, para
 * que ambas coincidan.
 */
export function renderBulletinHTML(content: JSONContent | null | undefined): string {
  if (!content) return "";
  try {
    return renderBlocksHTML(content.content);
  } catch {
    return "";
  }
}
