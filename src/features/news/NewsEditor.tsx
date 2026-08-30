"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2, Link2Off, Undo2, Redo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEWS_EXTENSIONS } from "@/lib/news-content";
import { AlignmentControl } from "@/components/ui/AlignmentControl";
import { normalizeAlign, type Align } from "@/lib/content-align";

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  icon: Icon,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none",
        active && "bg-brand-50 text-brand-700"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;
}

/**
 * Editor tipo Word para el campo "Contenido" de Noticias -- barra de
 * herramientas fija sobre el área de escritura, mismo criterio visual que
 * el resto del panel administrativo. Solo el set mínimo pedido (ver
 * lib/news-content.ts); nada de tablas/colores/tipografías libres.
 */
export function NewsEditor({ content, onChange }: { content: JSONContent; onChange: (json: JSONContent) => void }) {
  const editor = useEditor({
    extensions: NEWS_EXTENSIONS,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: "min-h-[220px] rounded-b-lg border border-t-0 border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const currentAlign: Align = normalizeAlign(
    (["center", "right", "justify"] as const).find((a) => editor.isActive({ textAlign: a })),
    "left"
  );

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (http://, https:// o mailto:)", previousUrl ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) {
      window.alert("El enlace debe comenzar con http://, https:// o mailto:");
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton label="Deshacer" icon={Undo2} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="Rehacer" icon={Redo2} onClick={() => editor.chain().focus().redo().run()} />
        <Divider />

        <select
          aria-label="Título/subtítulo"
          value={editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "0"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "0") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v) as 2 | 3 }).run();
          }}
          className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700"
        >
          <option value="0">Texto normal</option>
          <option value="2">Título</option>
          <option value="3">Subtítulo</option>
        </select>
        <Divider />

        <ToolbarButton label="Negrita" icon={Bold} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton label="Cursiva" icon={Italic} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton
          label="Subrayado"
          icon={UnderlineIcon}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <Divider />

        <AlignmentControl label={null} size="md" value={currentAlign} onChange={(align) => editor.chain().focus().setTextAlign(align).run()} />
        <Divider />

        <ToolbarButton
          label="Lista con viñetas"
          icon={List}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Lista numerada"
          icon={ListOrdered}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Divider />

        <ToolbarButton label="Enlace" icon={Link2} active={editor.isActive("link")} onClick={setLink} />
        <ToolbarButton
          label="Quitar enlace"
          icon={Link2Off}
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
