import type { Extensions, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";

/**
 * Editor de Contenido de Noticias -- set mínimo pedido (negrita, cursiva,
 * subrayado, alinear/centrar/justificar, viñetas, numerada, títulos,
 * enlaces, deshacer/rehacer), no el set amplio de Informativos Semanales
 * (bulletin-content.ts): sin tablas, colores, resaltado ni sub/superíndice
 * a propósito, para que el HTML resultante sea simple de validar en
 * renderNewsHTML. "Títulos/subtítulos" son heading niveles 2 y 3 -- el
 * nivel 1 lo sigue usando el título de la noticia (news.title), fuera del
 * editor.
 */
export const NEWS_EXTENSIONS: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    strike: false,
    code: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "left" }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),
];

export const EMPTY_NEWS_CONTENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export const ALLOWED_ALIGNMENTS = ["left", "center", "right", "justify"] as const;
export type NewsAlignment = (typeof ALLOWED_ALIGNMENTS)[number];

export function safeAlignment(value: unknown): NewsAlignment {
  return typeof value === "string" && (ALLOWED_ALIGNMENTS as readonly string[]).includes(value) ? (value as NewsAlignment) : "left";
}

/** Solo http(s), mailto o rutas relativas del propio sitio -- nunca `javascript:`, `data:` u otros esquemas. */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^(https?:\/\/|mailto:|\/)/i.test(value.trim());
}

/**
 * `news.content` es (y sigue siendo) una columna `text` -- el JSON del
 * editor se guarda serializado ahí mismo, sin columna ni migración nueva.
 * Las noticias ya existentes, escritas antes de este editor, tienen texto
 * plano (no JSON): se detectan y se convierten a un documento válido (un
 * párrafo por línea en blanco, saltos de línea sueltos como <br>) para que
 * abran igual de bien en el editor y se sigan viendo igual en el sitio
 * público, sin necesidad de reescribirlas.
 */
export function parseNewsContent(raw: string | null | undefined): JSONContent {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return EMPTY_NEWS_CONTENT;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && (parsed as JSONContent).type === "doc") return parsed as JSONContent;
    } catch {
      // No era JSON válido -- se trata como texto plano abajo.
    }
  }

  const paragraphs = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (paragraphs.length === 0) return EMPTY_NEWS_CONTENT;

  return {
    type: "doc",
    content: paragraphs.map((block) => ({
      type: "paragraph",
      content: block.split("\n").flatMap((line, i, arr) => {
        const textNode: JSONContent[] = line ? [{ type: "text", text: line }] : [];
        return i < arr.length - 1 ? [...textNode, { type: "hardBreak" }] : textNode;
      }),
    })),
  };
}

// -----------------------------------------------------------------------------
// Renderizador de solo lectura → HTML (mismo criterio que renderBulletinHTML:
// nunca usar generateHTML() de Tiptap en el servidor -- necesita un DOM real
// que no existe en un Server Component de Next.js. Este renderizador propio
// solo interpreta los nodos de NEWS_EXTENSIONS, escapa todo el texto y valida
// cada atributo antes de emitirlo, por lo que su resultado es seguro para
// dangerouslySetInnerHTML sin depender de una librería de sanitización.
// -----------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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

      if (has("bold")) html = `<strong>${html}</strong>`;
      if (has("italic")) html = `<em>${html}</em>`;
      if (has("underline")) html = `<u>${html}</u>`;

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

function renderBlocksHTML(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const level = [2, 3].includes(node.attrs?.level) ? node.attrs!.level : 2;
          const align = safeAlignment(node.attrs?.textAlign);
          return `<h${level}${align !== "left" ? ` style="text-align:${align}"` : ""}>${renderInlineHTML(node.content)}</h${level}>`;
        }
        case "paragraph": {
          if (!node.content) return "<p></p>";
          const align = safeAlignment(node.attrs?.textAlign);
          return `<p${align !== "left" ? ` style="text-align:${align}"` : ""}>${renderInlineHTML(node.content)}</p>`;
        }
        case "bulletList":
          return `<ul>${renderListItemsHTML(node.content)}</ul>`;
        case "orderedList":
          return `<ol>${renderListItemsHTML(node.content)}</ol>`;
        default:
          return "";
      }
    })
    .join("");
}

/** El editor vacío igual serializa a un doc con un párrafo sin texto -- para validar "Contenido requerido" hay que revisar si existe algún nodo de texto no vacío, no solo si el JSON es truthy. */
export function isNewsContentEmpty(content: JSONContent): boolean {
  function hasText(nodes: JSONContent[] | undefined): boolean {
    return (nodes ?? []).some((n) => (n.type === "text" && Boolean(n.text?.trim())) || hasText(n.content));
  }
  return !hasText(content.content);
}

export function renderNewsHTML(content: JSONContent | null | undefined): string {
  if (!content) return "";
  try {
    return renderBlocksHTML(content.content);
  } catch {
    return "";
  }
}
