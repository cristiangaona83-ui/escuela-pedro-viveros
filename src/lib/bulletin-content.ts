import type { Extensions, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

/**
 * Extensiones del editor de Informativos Semanales — deliberadamente
 * acotadas a lo pedido: títulos, subtítulos, párrafos, negrita, listas,
 * enlaces y saltos de línea. Sin citas, código ni tablas. Se comparten entre
 * el editor (BulletinEditor) y el renderizador de solo lectura para que la
 * vista previa, la web pública y el PDF interpreten siempre el mismo
 * contenido de la misma forma.
 */
export const BULLETIN_EXTENSIONS: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    italic: false,
    strike: false,
    code: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
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
      if (node.marks?.some((m) => m.type === "bold")) html = `<strong>${html}</strong>`;
      const href = node.marks?.find((m) => m.type === "link")?.attrs?.href;
      if (href) html = `<a href="${escapeHtml(String(href))}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      return html;
    })
    .join("");
}

function renderListItemsHTML(items: JSONContent[] | undefined): string {
  return (items ?? [])
    .map((item) => `<li>${renderInlineHTML(item.content?.find((c) => c.type === "paragraph")?.content)}</li>`)
    .join("");
}

function renderBlocksHTML(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const level = node.attrs?.level === 3 ? 3 : 2;
          return `<h${level}>${renderInlineHTML(node.content)}</h${level}>`;
        }
        case "paragraph":
          return node.content ? `<p>${renderInlineHTML(node.content)}</p>` : "";
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

/**
 * HTML de solo lectura a partir del JSON del editor — renderizador propio,
 * sin depender de `generateHTML` de Tiptap (esa función necesita un DOM real
 * vía ProseMirror/DOMSerializer y falla en el servidor de Next.js, donde no
 * existe `window`; la página pública del informativo se renderiza en el
 * servidor). Solo interpreta los nodos que produce BULLETIN_EXTENSIONS y
 * escapa todo el texto, por lo que es seguro insertar el resultado con
 * dangerouslySetInnerHTML. Se usa tanto en la vista previa dentro de la
 * plataforma como en la página pública, para que ambas coincidan.
 */
export function renderBulletinHTML(content: JSONContent | null | undefined): string {
  if (!content) return "";
  try {
    return renderBlocksHTML(content.content);
  } catch {
    return "";
  }
}
