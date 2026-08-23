import { Document, Page, View, Text, Link as PdfLink, StyleSheet } from "@react-pdf/renderer";
import type { JSONContent } from "@tiptap/core";
import { pdfStyles } from "./styles";
import { DocumentHeader } from "./DocumentHeader";
import { formatDate } from "@/lib/utils";
import { SITE } from "@/config/site";

const bulletinStyles = StyleSheet.create({
  subtitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: -14, color: "#274a3a" },
  meta: { fontSize: 9.5, textAlign: "center", marginTop: 4, marginBottom: 20, color: "#5c6b66" },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1c3229", marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: "#274a3a", marginTop: 10, marginBottom: 4 },
  paragraph: { fontSize: 10.5, lineHeight: 1.6, color: "#1c2624", marginBottom: 8, textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  link: { color: "#274a3a", textDecoration: "underline" },
  listRow: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  listBullet: { width: 14, fontSize: 10.5, color: "#274a3a" },
  listText: { flex: 1, fontSize: 10.5, lineHeight: 1.5, color: "#1c2624" },
  footer: { marginTop: 32, borderTopWidth: 1, borderTopColor: "#dce8e2", paddingTop: 10 },
  footerName: { fontSize: 9, textAlign: "center", fontFamily: "Helvetica-Bold", color: "#274a3a" },
  footerSlogan: { fontSize: 8.5, textAlign: "center", color: "#5c6b66", marginTop: 2 },
});

function renderInline(nodes: JSONContent[] | undefined, keyPrefix: string) {
  if (!nodes) return null;
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "hardBreak") return "\n";
    if (node.type !== "text" || !node.text) return null;
    const bold = node.marks?.some((m) => m.type === "bold");
    const link = node.marks?.find((m) => m.type === "link");
    const href = link?.attrs?.href as string | undefined;
    if (href) {
      return (
        <PdfLink key={key} src={href} style={bold ? [bulletinStyles.link, bulletinStyles.bold] : bulletinStyles.link}>
          {node.text}
        </PdfLink>
      );
    }
    return (
      <Text key={key} style={bold ? bulletinStyles.bold : undefined}>
        {node.text}
      </Text>
    );
  });
}

function renderListItems(items: JSONContent[] | undefined, keyPrefix: string) {
  return (items ?? []).map((item, i) => {
    const paragraph = item.content?.find((c) => c.type === "paragraph");
    return (
      <View key={`${keyPrefix}-${i}`} style={bulletinStyles.listRow}>
        <Text style={bulletinStyles.listBullet}>•</Text>
        <Text style={bulletinStyles.listText}>{renderInline(paragraph?.content, `${keyPrefix}-${i}`)}</Text>
      </View>
    );
  });
}

function renderBlocks(nodes: JSONContent[] | undefined) {
  if (!nodes) return null;
  return nodes.map((node, i) => {
    const key = `b-${i}`;
    switch (node.type) {
      case "heading": {
        const level = node.attrs?.level === 3 ? 3 : 2;
        return (
          <Text key={key} style={level === 3 ? bulletinStyles.h3 : bulletinStyles.h2}>
            {renderInline(node.content, key)}
          </Text>
        );
      }
      case "paragraph":
        return node.content ? (
          <Text key={key} style={bulletinStyles.paragraph}>
            {renderInline(node.content, key)}
          </Text>
        ) : null;
      case "bulletList":
      case "orderedList":
        return (
          <View key={key} style={{ marginBottom: 6 }}>
            {renderListItems(node.content, key)}
          </View>
        );
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
      <Page size="A4" style={pdfStyles.page}>
        <DocumentHeader />
        <Text style={pdfStyles.title}>INFORMATIVO SEMANAL N.º {number}</Text>
        <Text style={bulletinStyles.subtitle}>{title}</Text>
        <Text style={bulletinStyles.meta}>
          {weekLabel} · {formatDate(publishDate)}
        </Text>

        <View>{renderBlocks(content?.content)}</View>

        <View style={bulletinStyles.footer}>
          <Text style={bulletinStyles.footerName}>{SITE.name}</Text>
          <Text style={bulletinStyles.footerSlogan}>{SITE.slogan}</Text>
        </View>
      </Page>
    </Document>
  );
}
