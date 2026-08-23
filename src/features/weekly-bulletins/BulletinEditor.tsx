"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Bold, Heading2, Heading3, List, ListOrdered, Link2, Pilcrow, Undo2, Redo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BULLETIN_EXTENSIONS } from "@/lib/bulletin-content";

function ToolbarButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        active && "bg-brand-50 text-brand-700"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function BulletinEditor({ content, onChange }: { content: JSONContent; onChange: (json: JSONContent) => void }) {
  const editor = useEditor({
    extensions: BULLETIN_EXTENSIONS,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          "bulletin-content min-h-[320px] rounded-b-lg border border-t-0 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton
          label="Título"
          icon={Heading2}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="Subtítulo"
          icon={Heading3}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="Párrafo"
          icon={Pilcrow}
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton
          label="Negrita"
          icon={Bold}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Lista"
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
        <ToolbarButton label="Enlace" icon={Link2} active={editor.isActive("link")} onClick={setLink} />
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Deshacer" icon={Undo2} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="Rehacer" icon={Redo2} onClick={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
