"use client";

import { useState, type ChangeEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Baseline,
  Highlighter,
  Eraser,
  PanelTop,
  TextAlignStart,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  List,
  ListOrdered,
  ListIndentIncrease,
  ListIndentDecrease,
  Table as TableIcon,
  Link2,
  Link2Off,
  Minus,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
  Redo2,
  Rows3,
  Columns3,
  Trash2,
  Combine,
  Ungroup,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BULLETIN_EXTENSIONS, ALLOWED_FONT_SIZES } from "@/lib/bulletin-content";

const TEXT_COLORS = ["#1c2624", "#274a3a", "#b91c1c", "#1d4ed8", "#a16207", "#7c3aed"];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#e2e8f0"];

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

function ColorPicker({
  label,
  icon: Icon,
  colors,
  activeColor,
  onPick,
  onClear,
}: {
  label: string;
  icon: LucideIcon;
  colors: string[];
  activeColor?: string | null;
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  function handleCustom(e: ChangeEvent<HTMLInputElement>) {
    onPick(e.target.value);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={label}
        className="inline-flex h-8 w-8 flex-col items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Icon className="h-4 w-4" />
        <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: activeColor ?? "#cbd5e1" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <div className="grid grid-cols-6 gap-1.5">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => {
                    onPick(color);
                    setOpen(false);
                  }}
                  className="h-6 w-6 rounded-full border border-slate-200"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                <input type="color" onChange={handleCustom} className="h-6 w-6 cursor-pointer rounded border-0 p-0" />
                Personalizado
              </label>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Quitar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function BulletinEditor({ content, onChange }: { content: JSONContent; onChange: (json: JSONContent) => void }) {
  const [tableSize, setTableSize] = useState({ rows: 3, cols: 3 });

  const editor = useEditor({
    extensions: BULLETIN_EXTENSIONS,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          "bulletin-content min-h-[360px] rounded-b-lg border border-t-0 border-slate-200 bg-white px-6 py-5 text-sm text-slate-800 focus:outline-none sm:px-10 sm:py-8 max-w-[720px] mx-auto shadow-sm",
      },
    },
  });

  if (!editor) return null;

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

  const inTable = editor.isActive("table");
  const activeTextColor = editor.getAttributes("textStyle").color as string | undefined;
  const activeHighlight = editor.getAttributes("highlight").color as string | undefined;
  const activeFontSize = editor.getAttributes("textStyle").fontSize as string | undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton label="Deshacer" icon={Undo2} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="Rehacer" icon={Redo2} onClick={() => editor.chain().focus().redo().run()} />
        <Divider />

        <select
          aria-label="Estilo de título"
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : "0"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "0") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
          }}
          className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700"
        >
          <option value="0">Texto normal</option>
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
        </select>

        <select
          aria-label="Tamaño de texto"
          value={activeFontSize ? String(parseInt(activeFontSize, 10)) : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(`${v}px`).run();
          }}
          className="h-8 w-[72px] rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700"
        >
          <option value="">Tamaño</option>
          {ALLOWED_FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
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
        <ToolbarButton
          label="Tachado"
          icon={Strikethrough}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ColorPicker
          label="Color de texto"
          icon={Baseline}
          colors={TEXT_COLORS}
          activeColor={activeTextColor}
          onPick={(color) => editor.chain().focus().setColor(color).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorPicker
          label="Resaltado"
          icon={Highlighter}
          colors={HIGHLIGHT_COLORS}
          activeColor={activeHighlight}
          onPick={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />
        <ToolbarButton
          label="Limpiar formato"
          icon={Eraser}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        />
        <Divider />

        <ToolbarButton
          label="Alinear a la izquierda"
          icon={TextAlignStart}
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          label="Centrar"
          icon={TextAlignCenter}
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          label="Alinear a la derecha"
          icon={TextAlignEnd}
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <ToolbarButton
          label="Justificar"
          icon={TextAlignJustify}
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        />
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
        <ToolbarButton
          label="Aumentar sangría"
          icon={ListIndentIncrease}
          disabled={!editor.can().sinkListItem("listItem")}
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        />
        <ToolbarButton
          label="Disminuir sangría"
          icon={ListIndentDecrease}
          disabled={!editor.can().liftListItem("listItem")}
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        />
        <Divider />

        <ToolbarButton
          label="Superíndice"
          icon={SuperscriptIcon}
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        />
        <ToolbarButton
          label="Subíndice"
          icon={SubscriptIcon}
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        />
        <Divider />

        <ToolbarButton label="Enlace" icon={Link2} active={editor.isActive("link")} onClick={setLink} />
        <ToolbarButton
          label="Quitar enlace"
          icon={Link2Off}
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
        <ToolbarButton label="Línea horizontal" icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <Divider />

        <div className="relative inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1">
          <TableIcon className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="number"
            min={1}
            max={12}
            value={tableSize.rows}
            onChange={(e) => setTableSize((s) => ({ ...s, rows: Math.max(1, Number(e.target.value)) }))}
            className="h-6 w-9 rounded border border-slate-200 text-center text-xs"
            aria-label="Filas"
          />
          <span className="text-xs text-slate-400">×</span>
          <input
            type="number"
            min={1}
            max={12}
            value={tableSize.cols}
            onChange={(e) => setTableSize((s) => ({ ...s, cols: Math.max(1, Number(e.target.value)) }))}
            className="h-6 w-9 rounded border border-slate-200 text-center text-xs"
            aria-label="Columnas"
          />
          <button
            type="button"
            title="Insertar tabla"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: tableSize.rows, cols: tableSize.cols, withHeaderRow: true })
                .run()
            }
            className="ml-1 inline-flex h-6 items-center rounded bg-brand-700 px-2 text-xs font-medium text-white hover:bg-brand-800"
          >
            Insertar tabla
          </button>
        </div>
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-x border-slate-200 bg-brand-50/60 px-2 py-1.5">
          <span className="mr-1 text-xs font-medium text-brand-700">Tabla:</span>
          <ToolbarButton label="Agregar fila arriba" icon={Rows3} onClick={() => editor.chain().focus().addRowBefore().run()} />
          <ToolbarButton label="Agregar fila abajo" icon={Rows3} onClick={() => editor.chain().focus().addRowAfter().run()} />
          <ToolbarButton label="Eliminar fila" icon={Trash2} onClick={() => editor.chain().focus().deleteRow().run()} />
          <Divider />
          <ToolbarButton label="Agregar columna izquierda" icon={Columns3} onClick={() => editor.chain().focus().addColumnBefore().run()} />
          <ToolbarButton label="Agregar columna derecha" icon={Columns3} onClick={() => editor.chain().focus().addColumnAfter().run()} />
          <ToolbarButton label="Eliminar columna" icon={Trash2} onClick={() => editor.chain().focus().deleteColumn().run()} />
          <Divider />
          <ToolbarButton label="Combinar celdas" icon={Combine} onClick={() => editor.chain().focus().mergeCells().run()} />
          <ToolbarButton label="Separar celdas" icon={Ungroup} onClick={() => editor.chain().focus().splitCell().run()} />
          <ToolbarButton
            label="Encabezado de tabla"
            icon={PanelTop}
            active={editor.isActive("tableHeader")}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          />
          <ColorPicker
            label="Color de fondo de celda"
            icon={Highlighter}
            colors={HIGHLIGHT_COLORS}
            onPick={(color) => editor.chain().focus().setCellAttribute("backgroundColor", color).run()}
            onClear={() => editor.chain().focus().setCellAttribute("backgroundColor", null).run()}
          />
          <Divider />
          <ToolbarButton label="Eliminar tabla" icon={Trash2} onClick={() => editor.chain().focus().deleteTable().run()} />
        </div>
      )}

      <EditorContent editor={editor} className={cn("rounded-b-lg border border-t-0 border-slate-200 bg-slate-100 p-4 sm:p-6", inTable && "rounded-t-none border-t-0")} />
    </div>
  );
}
