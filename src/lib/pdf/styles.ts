import { StyleSheet, Font } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

export const pdfStyles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1c2624" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logoBox: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: "#1c5140",
    alignItems: "center", justifyContent: "center",
  },
  logoText: { color: "#ffffff", fontSize: 14, fontFamily: "Helvetica-Bold" },
  schoolName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1c5140" },
  schoolAddress: { fontSize: 8, color: "#5c6b66", marginTop: 2 },
  folio: { fontSize: 9, color: "#8f3917", textAlign: "right" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 16, marginBottom: 20, color: "#14352c" },
  paragraph: { fontSize: 11, lineHeight: 1.7, textAlign: "justify", marginBottom: 10 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 16, borderWidth: 1, borderColor: "#d6ebdf" },
  tableRowHeader: { flexDirection: "row", backgroundColor: "#eef6f2" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#eef6f2" },
  th: { flex: 1, padding: 6, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1c5140" },
  td: { flex: 1, padding: 6, fontSize: 9, color: "#1c2624" },
  tdCenter: { flex: 1, padding: 6, fontSize: 9, color: "#1c2624", textAlign: "center" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 48 },
  signatureBlock: { alignItems: "center", width: 200 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#1c2624", width: "100%", marginBottom: 4, marginTop: 40 },
  signatureName: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  signatureTitle: { fontSize: 9, color: "#5c6b66" },
  qr: { width: 64, height: 64 },
  disclaimer: { fontSize: 7.5, color: "#8a938f", marginTop: 24, textAlign: "center" },
});
