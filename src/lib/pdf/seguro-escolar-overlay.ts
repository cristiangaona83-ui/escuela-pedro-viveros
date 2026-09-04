import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { formatFolio, accidentWeekday } from "@/features/seguro-escolar/utils";
import type { DeclarationDetail } from "@/services/seguro-escolar";
import type { SeguroEscolarInstitutionalContext } from "@/services/seguro-escolar";

/**
 * Genera el PDF oficial (Formulario 0374-3) usando el PDF real del ISL como
 * plantilla -- se incrusta tal cual (página 1 de fondo con los valores
 * superpuestos encima, página 2 de instrucciones intacta), en vez de
 * redibujar el formulario desde cero. El PDF fuente es una imagen escaneada
 * sin campos AcroForm ni texto embebido, así que la única forma de
 * conservar el formato exacto es esta: overlay de texto en coordenadas
 * fijas sobre la página incrustada como fondo.
 *
 * Coordenadas: primer intento cuidadoso a partir de la inspección visual
 * del formulario (595x842pt, A4), documentado como fracciones de página
 * para que sea fácil de ajustar sin perder el criterio de cada campo. Es
 * razonable esperar un ajuste fino tras la primera revisión visual real --
 * no hay forma de validar píxel a píxel sin abrir el PDF generado al lado
 * del original.
 */

const TEMPLATE_PATH = path.join(process.cwd(), "src/lib/pdf/templates/formulario-0374-3.pdf");
const PAGE_W = 595.28;
const PAGE_H = 841.89;

function fx(frac: number) { return frac * PAGE_W; }
function fyTop(frac: number) { return PAGE_H - frac * PAGE_H; } // pdf-lib mide Y desde abajo

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
}

function text(ctx: DrawCtx, value: string | number | null | undefined, xFrac: number, yFracTop: number, size = 9) {
  const v = value === null || value === undefined || value === "" ? "" : String(value);
  if (!v) return;
  ctx.page.drawText(v, { x: fx(xFrac), y: fyTop(yFracTop), size, font: ctx.font, color: rgb(0.05, 0.05, 0.2) });
}

function code(ctx: DrawCtx, value: number | null | undefined, xFrac: number, yFracTop: number, size = 10) {
  if (value === null || value === undefined) return;
  ctx.page.drawText(String(value), { x: fx(xFrac), y: fyTop(yFracTop), size, font: ctx.font, color: rgb(0.05, 0.05, 0.2) });
}

async function embedPngOrJpg(doc: PDFDocument, dataUri: string) {
  const isPng = dataUri.startsWith("data:image/png");
  const base64 = dataUri.split(",")[1] ?? "";
  const bytes = Buffer.from(base64, "base64");
  return isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

export interface GenerateSeguroEscolarPdfInput {
  declaration: DeclarationDetail;
  institutional: SeguroEscolarInstitutionalContext;
  directorSignatureDataUri: string | null;
  stampDataUri: string | null;
}

export async function generateSeguroEscolarPdf(input: GenerateSeguroEscolarPdfInput): Promise<Uint8Array> {
  const { declaration, institutional } = input;
  const templateBytes = await readFile(TEMPLATE_PATH);
  const templateDoc = await PDFDocument.load(templateBytes);
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);

  const [page1, page2] = await outDoc.copyPages(templateDoc, [0, 1]);
  outDoc.addPage(page1);

  const ctx: DrawCtx = { page: page1, font };
  const folio = formatFolio(declaration.folio_year, declaration.folio_number);
  const weekday = accidentWeekday(declaration.accident_date);

  // N°
  text(ctx, folio, 0.735, 0.083, 11);

  // FISCAL O MUNICIPAL / PARTICULAR
  code(ctx, institutional.establishmentTypeCode, 0.846, 0.128);

  // A. Individualización del establecimiento
  text(ctx, institutional.establishmentName, 0.1, 0.168);
  text(ctx, institutional.city, 0.365, 0.168);
  text(ctx, institutional.commune, 0.55, 0.168);
  text(ctx, declaration.course_label, 0.1, 0.203);
  text(ctx, declaration.schedule, 0.28, 0.203);
  const regDate = new Date(declaration.registration_date + "T00:00:00");
  text(ctx, String(regDate.getDate()).padStart(2, "0"), 0.492, 0.201, 9);
  text(ctx, String(regDate.getMonth() + 1).padStart(2, "0"), 0.542, 0.201, 9);
  text(ctx, regDate.getFullYear(), 0.6, 0.201, 9);

  // B. Individualización del accidentado
  text(ctx, declaration.student_last_name_paterno, 0.1, 0.272);
  text(ctx, declaration.student_last_name_materno, 0.28, 0.272);
  text(ctx, declaration.student_first_names, 0.463, 0.272);
  code(ctx, declaration.student_sex === "M" ? 1 : declaration.student_sex === "F" ? 2 : null, 0.607, 0.264);
  text(ctx, declaration.student_birth_year, 0.673, 0.263, 9);
  text(ctx, declaration.student_age, 0.842, 0.263, 9);

  // Residencia habitual
  text(ctx, declaration.residence_street, 0.1, 0.332);
  text(ctx, declaration.residence_number, 0.318, 0.332);
  text(ctx, declaration.residence_population, 0.403, 0.332);
  text(ctx, declaration.residence_commune, 0.539, 0.332);
  text(ctx, declaration.residence_city, 0.642, 0.332, 8);
  text(ctx, declaration.residence_commune_code, 0.742, 0.313, 8);

  // C. Informe sobre el accidente
  const hh = declaration.accident_hour !== null ? String(declaration.accident_hour).padStart(2, "0") : "";
  const mm = declaration.accident_minute !== null ? String(declaration.accident_minute).padStart(2, "0") : "";
  text(ctx, hh, 0.098, 0.412, 10);
  text(ctx, mm, 0.145, 0.412, 10);
  const accDate = new Date(declaration.accident_date + "T00:00:00");
  text(ctx, accDate.getFullYear(), 0.222, 0.412, 9);
  text(ctx, String(accDate.getMonth() + 1).padStart(2, "0"), 0.31, 0.412, 9);
  text(ctx, String(accDate.getDate()).padStart(2, "0"), 0.4, 0.412, 9);

  code(ctx, weekday, 0.222, 0.451);
  code(ctx, declaration.accident_type === "trayecto" ? 1 : 2, 0.31, 0.451);

  if (declaration.accident_type === "trayecto") {
    text(ctx, [declaration.witness_a_name, declaration.witness_a_lastname].filter(Boolean).join(" "), 0.465, 0.442, 8);
    text(ctx, declaration.witness_a_id, 0.81, 0.442, 8);
    text(ctx, [declaration.witness_b_name, declaration.witness_b_lastname].filter(Boolean).join(" "), 0.465, 0.468, 8);
    text(ctx, declaration.witness_b_id, 0.81, 0.468, 8);
  }

  // Circunstancia -- ajusta a 3 líneas de ~95 caracteres, tal como el
  // espacio impreso del formulario (3 renglones).
  const lines = wrapText(declaration.circumstance, 95).slice(0, 3);
  lines.forEach((line, i) => text(ctx, line, 0.1, 0.503 + i * 0.019, 9));

  // Firma y timbre
  await drawSignature(outDoc, page1, input.directorSignatureDataUri, input.stampDataUri);

  // D. Naturaleza y consecuencia del accidente -- solo si ya se transcribió;
  // si sigue 'blank', la sección queda intacta (en blanco) tal como pide el
  // punto 13 del pedido.
  if (declaration.section_d_mode === "transcribed") {
    text(ctx, declaration.assistance_establishment, 0.13, 0.647, 8);
    text(ctx, declaration.health_service_code, 0.756, 0.632, 9);
    text(ctx, declaration.establishment_code, 0.87, 0.632, 9);
    text(ctx, declaration.medical_diagnosis, 0.13, 0.687, 8);
    text(ctx, declaration.body_part_affected, 0.13, 0.727, 8);
    code(ctx, declaration.hospitalization ? 1 : declaration.hospitalization === false ? 2 : null, 0.588, 0.727);
    if (declaration.hospitalization) text(ctx, declaration.hospitalization_days, 0.68, 0.727, 9);
    code(ctx, declaration.incapacity ? 1 : declaration.incapacity === false ? 2 : null, 0.79, 0.727);
    if (declaration.incapacity) text(ctx, declaration.incapacity_days, 0.87, 0.727, 9);

    const incapacityCode = { leve: 1, temporal: 2, invalidez_parcial: 3, invalidez_total: 4, gran_invalidez: 5, muerte: 6 } as const;
    const closureCode = { alta_medica: 1, invalidez: 2, abandono_tratamiento: 3, muerte: 4 } as const;
    code(ctx, declaration.incapacity_type ? incapacityCode[declaration.incapacity_type] : null, 0.31, 0.784);
    code(ctx, declaration.case_closure_cause ? closureCode[declaration.case_closure_cause] : null, 0.47, 0.784);
    if (declaration.case_closure_date) {
      const closeDate = new Date(declaration.case_closure_date + "T00:00:00");
      text(ctx, closeDate.getFullYear(), 0.57, 0.798, 8);
      text(ctx, String(closeDate.getMonth() + 1).padStart(2, "0"), 0.615, 0.798, 8);
      text(ctx, String(closeDate.getDate()).padStart(2, "0"), 0.655, 0.798, 8);
    }
  }

  outDoc.addPage(page2);

  return outDoc.save();
}

async function drawSignature(doc: PDFDocument, page: PDFPage, signatureDataUri: string | null, stampDataUri: string | null) {
  try {
    if (signatureDataUri) {
      const img = await embedPngOrJpg(doc, signatureDataUri);
      const w = 120;
      const h = (img.height / img.width) * w;
      page.drawImage(img, { x: fx(0.665), y: fyTop(0.502) - h, width: w, height: h });
    }
    if (stampDataUri) {
      const img = await embedPngOrJpg(doc, stampDataUri);
      const size = 60;
      page.drawImage(img, { x: fx(0.8), y: fyTop(0.502) - size, width: size, height: size });
    }
  } catch {
    // Firma/timbre no disponibles -- el PDF se genera igual, sin ellos.
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}
