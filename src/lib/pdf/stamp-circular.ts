import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { looksLikeDirectorName } from "@/lib/director-name";
import type { DirectorSignature } from "@/lib/pdf/director-signature";

// El worker se importa de forma estática (no por ruta dinámica) para que
// quede incluido en el despliegue: pdfjs lo busca en globalThis.pdfjsWorker.
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

export type CircularStampMode = "above-name" | "appended-page";

const SIGNATURE_WIDTH_ALONE = 150;
const SIGNATURE_WIDTH_WITH_STAMP = 120;
const STAMP_SIZE = 60;
const IMAGE_GAP = 6;
const MAX_IMAGE_HEIGHT = 75;

interface NameLine {
  pageIndex: number;
  x: number;
  width: number;
  /** Línea base del texto (coordenadas PDF: y crece hacia arriba). */
  y: number;
  height: number;
}

function dataUriToBytes(dataUri: string): { bytes: Uint8Array; type: "png" | "jpeg" } | null {
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUri);
  if (!match) return null;
  return { bytes: Uint8Array.from(Buffer.from(match[2], "base64")), type: match[1] as "png" | "jpeg" };
}

async function embed(doc: PDFDocument, dataUri: string | null | undefined): Promise<PDFImage | null> {
  if (!dataUri) return null;
  const parsed = dataUriToBytes(dataUri);
  if (!parsed) return null;
  return parsed.type === "png" ? doc.embedPng(parsed.bytes) : doc.embedJpg(parsed.bytes);
}

/**
 * Busca, de la última página hacia atrás, la línea de texto corta que es el
 * nombre impreso del Director y devuelve su posición (la más baja de la
 * página, que es donde va la firma). null si no hay texto seleccionable
 * (PDF escaneado), no aparece el nombre, o pdfjs falla -- el llamador cae
 * entonces a agregar una hoja final.
 */
async function findDirectorNameLine(pdfBytes: Uint8Array, directorName: string): Promise<NameLine | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data: new Uint8Array(pdfBytes), useSystemFonts: true, verbosity: 0 });
    const pdf = await task.promise;
    try {
      for (let pageNumber = pdf.numPages; pageNumber >= 1; pageNumber--) {
        const page = await pdf.getPage(pageNumber);
        const { items } = await page.getTextContent();

        type Item = { str: string; x: number; y: number; width: number; height: number };
        const texts: Item[] = items
          .filter((it): it is (typeof items)[number] & { str: string; transform: number[]; width: number; height: number } => "str" in it && it.str.trim() !== "")
          .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width, height: it.height || Math.abs(it.transform[3]) }));

        const lines: Item[][] = [];
        for (const item of texts) {
          const line = lines.find((l) => Math.abs(l[0].y - item.y) < 2);
          if (line) line.push(item);
          else lines.push([item]);
        }

        let best: NameLine | null = null;
        for (const line of lines) {
          line.sort((a, b) => a.x - b.x);
          let text = "";
          let prevEnd = line[0].x;
          for (const it of line) {
            if (text && it.x - prevEnd > 1.5) text += " ";
            text += it.str;
            prevEnd = it.x + it.width;
          }
          if (!looksLikeDirectorName(text, directorName)) continue;
          const x = line[0].x;
          const candidate: NameLine = {
            pageIndex: pageNumber - 1,
            x,
            width: prevEnd - x,
            y: line[0].y,
            height: Math.max(...line.map((l) => l.height)),
          };
          if (!best || candidate.y < best.y) best = candidate;
        }
        if (best) return best;
      }
      return null;
    } finally {
      await task.destroy();
    }
  } catch (err) {
    console.error("[circulares] no se pudo analizar el texto del PDF", err);
    return null;
  }
}

function layoutImages(signature: PDFImage, stamp: PDFImage | null) {
  const sigWidth = stamp ? SIGNATURE_WIDTH_WITH_STAMP : SIGNATURE_WIDTH_ALONE;
  const sigScale = Math.min(sigWidth / signature.width, MAX_IMAGE_HEIGHT / signature.height);
  const sig = { width: signature.width * sigScale, height: signature.height * sigScale };
  const st = stamp ? { width: STAMP_SIZE, height: STAMP_SIZE } : null;
  const totalWidth = sig.width + (st ? IMAGE_GAP + st.width : 0);
  const totalHeight = Math.max(sig.height, st?.height ?? 0);
  return { sig, st, totalWidth, totalHeight };
}

/**
 * Agrega la firma (y el timbre) del Director a una circular ya hecha:
 *  - si encuentra el nombre impreso del Director en el PDF, los estampa
 *    justo arriba, centrados sobre ese texto ("above-name");
 *  - si no (PDF escaneado, nombre distinto, etc.), agrega una hoja final con
 *    la firma, el timbre, el nombre y el cargo ("appended-page") -- nunca
 *    tapa el contenido original.
 * Devuelve null si la firma configurada no es PNG/JPG (no se puede incrustar).
 */
export async function stampCircularPdf(
  pdfBytes: Uint8Array,
  signature: DirectorSignature
): Promise<{ bytes: Uint8Array; mode: CircularStampMode } | null> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const sigImage = await embed(doc, signature.signatureDataUri);
  if (!sigImage) return null;
  const stampImage = await embed(doc, signature.stampDataUri);
  const { sig, st, totalWidth, totalHeight } = layoutImages(sigImage, stampImage);

  const anchor = await findDirectorNameLine(pdfBytes, signature.directorName);
  if (anchor) {
    const page = doc.getPage(anchor.pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const left = Math.min(Math.max(10, anchor.x + anchor.width / 2 - totalWidth / 2), pageWidth - totalWidth - 10);
    const bottom = Math.min(anchor.y + anchor.height + 2, pageHeight - totalHeight - 10);
    page.drawImage(sigImage, { x: left, y: bottom + (totalHeight - sig.height) / 2, width: sig.width, height: sig.height });
    if (stampImage && st) {
      page.drawImage(stampImage, { x: left + sig.width + IMAGE_GAP, y: bottom + (totalHeight - st.height) / 2, width: st.width, height: st.height });
    }
    return { bytes: await doc.save(), mode: "above-name" };
  }

  const lastPage = doc.getPage(doc.getPageCount() - 1);
  const { width: pageWidth, height: pageHeight } = lastPage.getSize();
  const page = doc.addPage([pageWidth, pageHeight]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const left = (pageWidth - totalWidth) / 2;
  const imagesBottom = pageHeight * 0.5;
  page.drawImage(sigImage, { x: left, y: imagesBottom + (totalHeight - sig.height) / 2, width: sig.width, height: sig.height });
  if (stampImage && st) {
    page.drawImage(stampImage, { x: left + sig.width + IMAGE_GAP, y: imagesBottom + (totalHeight - st.height) / 2, width: st.width, height: st.height });
  }
  const centered = (text: string, font: typeof bold, size: number, y: number, color = rgb(0.11, 0.15, 0.14)) =>
    page.drawText(text, { x: (pageWidth - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  centered(signature.directorName, bold, 11, imagesBottom - 16);
  centered(signature.directorTitle, regular, 10, imagesBottom - 30, rgb(0.36, 0.42, 0.4));
  return { bytes: await doc.save(), mode: "appended-page" };
}
