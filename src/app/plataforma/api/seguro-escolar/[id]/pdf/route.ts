import { NextResponse } from "next/server";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getSeguroEscolarDeclaration, getSeguroEscolarInstitutionalContext } from "@/services/seguro-escolar";
import { formatFolio } from "@/features/seguro-escolar/utils";
import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { generateSeguroEscolarPdf } from "@/lib/pdf/seguro-escolar-overlay";

export const runtime = "nodejs";

const MANAGE_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

/** Sanitiza el nombre sugerido de archivo -- sin acentos/caracteres
 * especiales que puedan romper el header Content-Disposition o el sistema
 * de archivos del usuario. */
function sanitizeFileNamePart(value: string): string {
  return value
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...MANAGE_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este documento" }, { status: 403 });
  }

  const declaration = await getSeguroEscolarDeclaration(id);
  if (!declaration) return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });

  const [institutional, directorSignatureDataUri, stampDataUri] = await Promise.all([
    getSeguroEscolarInstitutionalContext(),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
  ]);

  const pdfBytes = await generateSeguroEscolarPdf({ declaration, institutional, directorSignatureDataUri, stampDataUri });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  const [apellido, nombre] = declaration.studentName.split(",").map((s) => s.trim());
  const fileName = `Seguro_Escolar_${sanitizeFileNamePart(apellido || declaration.studentName)}_${sanitizeFileNamePart(nombre || "")}_${declaration.accident_date}.pdf`;

  await logPdfGeneration(id, formatFolio(declaration.folio_year, declaration.folio_number));

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
    },
  });
}

async function logPdfGeneration(declarationId: string, folio: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_pdf_seguro_escolar",
    p_module: "seguro_escolar",
    p_entity: "seguro_escolar_declarations",
    p_entity_id: declarationId,
    p_details: { folio },
  });
}
