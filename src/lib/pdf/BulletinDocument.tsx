import { Document, Page, View, Text, Link as PdfLink, StyleSheet } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { JSONContent } from "@tiptap/core";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { SITE } from "@/config/site";
import { isSafeColor, isSafeUrl, safeAlignment, safeFontSizePx, formatBulletinDate, type BulletinAlignment } from "@/lib/bulletin-content";

const bulletinStyles = StyleSheet.create({
  weekLine: { fontSize: 10.5, textAlign: "center", marginTop: -14, marginBottom: 20, color: "#5c6b66" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0f1e18", marginTop: 16, marginBottom: 7 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1c3229", marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: "#274a3a", marginTop: 10, marginBottom: 4 },
  paragraph: { fontSize: 10.5, lineHeight: 1.6, color: "#1c2624", marginBottom: 8 },
  listRow: { flexDirection: "row", marginBottom: 3 },
  listBullet: { width: 16, fontSize: 10.5, color: "#274a3a" },
  listContent: { flex: 1 },
  hr: { borderTopWidth: 1, borderTopColor: "#b8d1c4", marginVertical: 12 },
  table: { marginBottom: 10, borderWidth: 1, borderColor: "#b8d1c4" },
  tableRow: { flexDirection: "row" },
  tableCell: { flex: 1, borderColor: "#b8d1c4", borderRightWidth: 1, borderBottomWidth: 1, padding: 5 },
  tableHeaderCell: { backgroundColor: "#f0f5f3" },
  tableCellText: { fontSize: 9.5, lineHeight: 1.4, color: "#1c2624" },
  tableHeaderText: { fontFamily: "Helvetica-Bold", color: "#213c30" },
  footer: { marginTop: 32, borderTopWidth: 1, borderTopColor: "#dce8e2", paddingTop: 10 },
  footerSlogan: { fontSize: 9, textAlign: "center", fontFamily: "Helvetica-Oblique", color: "#5c6b66" },
});

const HEADING_STYLE: Record<number, Style> = { 1: bulletinStyles.h1, 2: bulletinStyles.h2, 3: bulletinStyles.h3 };

type Mark = { type: string; attrs?: Record<string, unknown> };

function inlineStyleFor(marks: Mark[] | undefined): Style {
  const has = (type: string) => marks?.some((m) => m.type === type) ?? false;
  const bold = has("bold");
  const italic = has("italic");

  const style: Style = {};
  if (bold && italic) style.fontFamily = "Helvetica-BoldOblique";
  else if (bold) style.fontFamily = "Helvetica-Bold";
  else if (italic) style.fontFamily = "Helvetica-Oblique";

  if (has("underline")) style.textDecoration = "underline";
  else if (has("strike")) style.textDecoration = "line-through";

  const textStyleMark = marks?.find((m) => m.type === "textStyle");
  const color = textStyleMark?.attrs?.color;
  if (isSafeColor(color)) style.color = color;
  const fontSizePx = safeFontSizePx(textStyleMark?.attrs?.fontSize);
  if (fontSizePx) style.fontSize = fontSizePx;

  const highlightMark = marks?.find((m) => m.type === "highlight");
  if (highlightMark) {
    const hl = highlightMark.attrs?.color;
    style.backgroundColor = isSafeColor(hl) ? hl : "#fef08a";
  }

  const baseSize = typeof style.fontSize === "number" ? style.fontSize : 10.5;
  if (has("subscript")) {
    style.verticalAlign = "sub";
    style.fontSize = baseSize * 0.75;
  } else if (has("superscript")) {
    style.verticalAlign = "super";
    style.fontSize = baseSize * 0.75;
  }

  return style;
}

function renderInline(nodes: JSONContent[] | undefined, keyPrefix: string) {
  if (!nodes) return null;
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "hardBreak") return "\n";
    if (node.type !== "text" || !node.text) return null;
    const style = inlineStyleFor(node.marks as Mark[] | undefined);
    const linkMark = (node.marks as Mark[] | undefined)?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;
    if (isSafeUrl(href)) {
      return (
        <PdfLink key={key} src={href} style={{ color: style.color ?? "#274a3a", textDecoration: "underline", ...style }}>
          {node.text}
        </PdfLink>
      );
    }
    return (
      <Text key={key} style={style}>
        {node.text}
      </Text>
    );
  });
}

function alignStyle(align: BulletinAlignment): Style {
  return { textAlign: align };
}

function renderList(node: JSONContent, keyPrefix: string, depth: number, ordered: boolean, cellKind: CellKind) {
  const items = node.content ?? [];
  return (
    <View key={keyPrefix} style={{ marginBottom: 6, marginLeft: depth * 14 }}>
      {items.map((item, i) => (
        <View key={`${keyPrefix}-li-${i}`} style={bulletinStyles.listRow}>
          <Text style={bulletinStyles.listBullet}>{ordered ? `${i + 1}.` : "•"}</Text>
          <View style={bulletinStyles.listContent}>{renderBlocks(item.content, `${keyPrefix}-li-${i}`, depth + 1, cellKind)}</View>
        </View>
      ))}
    </View>
  );
}

function renderTable(node: JSONContent, keyPrefix: string) {
  const rows = node.content ?? [];
  const columnCount = Math.max(
    1,
    ...rows.map((row) =>
      (row.content ?? []).reduce((sum, cell) => sum + (typeof cell.attrs?.colspan === "number" ? cell.attrs.colspan : 1), 0)
    )
  );
  const occupancy: boolean[][] = rows.map(() => Array(columnCount).fill(false));

  return (
    <View key={keyPrefix} style={bulletinStyles.table} wrap>
      {rows.map((row, rIdx) => {
        let colCursor = 0;
        const cells = (row.content ?? []).map((cell, cIdx) => {
          while (colCursor < columnCount && occupancy[rIdx][colCursor]) colCursor++;
          const colspan = typeof cell.attrs?.colspan === "number" ? cell.attrs.colspan : 1;
          const rowspan = typeof cell.attrs?.rowspan === "number" ? cell.attrs.rowspan : 1;
          for (let r = rIdx; r < Math.min(rIdx + rowspan, rows.length); r++) {
            for (let c = colCursor; c < colCursor + colspan; c++) {
              if (occupancy[r]) occupancy[r][c] = true;
            }
          }
          const isHeader = cell.type === "tableHeader";
          const bg = isSafeColor(cell.attrs?.backgroundColor) ? cell.attrs.backgroundColor : undefined;
          const cellKey = `${keyPrefix}-r${rIdx}-c${cIdx}`;
          const el = (
            <View
              key={cellKey}
              style={[bulletinStyles.tableCell, { flex: colspan }, isHeader ? bulletinStyles.tableHeaderCell : null, bg ? { backgroundColor: bg } : null].filter(
                Boolean
              ) as Style[]}
            >
              {renderBlocks(cell.content, cellKey, 0, isHeader ? "header" : "body")}
            </View>
          );
          colCursor += colspan;
          return el;
        });
        return (
          <View key={`${keyPrefix}-row-${rIdx}`} style={bulletinStyles.tableRow} wrap={false}>
            {cells}
          </View>
        );
      })}
    </View>
  );
}

type CellKind = "header" | "body" | undefined;

function renderBlocks(nodes: JSONContent[] | undefined, keyPrefix = "b", depth = 0, cellKind: CellKind = undefined) {
  if (!nodes) return null;
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.type) {
      case "heading": {
        const level = [1, 2, 3].includes(node.attrs?.level) ? (node.attrs!.level as number) : 2;
        const align = safeAlignment(node.attrs?.textAlign);
        return (
          <Text key={key} style={[HEADING_STYLE[level], alignStyle(align)]}>
            {renderInline(node.content, key)}
          </Text>
        );
      }
      case "paragraph": {
        if (!node.content) return null;
        const align = safeAlignment(node.attrs?.textAlign);
        const baseStyle = cellKind ? bulletinStyles.tableCellText : bulletinStyles.paragraph;
        const style: Style[] = [baseStyle, alignStyle(align)];
        if (cellKind === "header") style.push(bulletinStyles.tableHeaderText);
        return (
          <Text key={key} style={style}>
            {renderInline(node.content, key)}
          </Text>
        );
      }
      case "bulletList":
        return renderList(node, key, depth, false, cellKind);
      case "orderedList":
        return renderList(node, key, depth, true, cellKind);
      case "table":
        return renderTable(node, key);
      case "horizontalRule":
        return <View key={key} style={bulletinStyles.hr} />;
      default:
        return null;
    }
  });
}

export function BulletinDocument({
  number,
  title,
  weekLabel,
  publishDate,
  content,
}: {
  number: number;
  title: string;
  weekLabel: string;
  publishDate: string;
  content: JSONContent;
}) {
  return (
    <Document title={`Informativo Semanal N.º ${number} - ${title}`}>
      <Page size="A4" style={pdfStyles.page} wrap>
        <DocumentHeader dateLabel={`San Antonio, ${formatBulletinDate(publishDate)}`} />
        <Text style={pdfStyles.title}>INFORMATIVO SEMANAL N.º {number}</Text>
        <Text style={bulletinStyles.weekLine}>{weekLabel}</Text>

        <View>{renderBlocks(content?.content)}</View>

        <View style={bulletinStyles.footer}>
          <Text style={bulletinStyles.footerSlogan}>{SITE.slogan}</Text>
        </View>
      </Page>
    </Document>
  );
}
