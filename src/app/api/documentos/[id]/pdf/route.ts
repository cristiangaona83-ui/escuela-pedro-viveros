import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { STATIC_INSTITUTIONAL_DOCUMENTS } from "@/config/institutional-documents";

export const runtime = "nodejs";

/**
 * Descarga con nombre de archivo legible para los Documentos Institucionales
 * públicos — cubre tanto los documentos estáticos (`public/documents/`) como
 * los administrados desde la plataforma (tabla `documents`, Supabase
 * Storage), para que ninguno de los dos muestre a las familias un nombre de
 * archivo técnico (ni la ruta interna, ni el UUID de Storage).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staticDoc = STATIC_INSTITUTIONAL_DOCUMENTS.find((d) => d.id === id);
  if (staticDoc) {
    try {
      const filePath = join(process.cwd(), "public", staticDoc.file_url);
      const buffer = readFileSync(filePath);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slugify(staticDoc.title)}.pdf"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "No se pudo leer el documento" }, { status: 500 });
    }
  }

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("title, file_url, is_public")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const upstream = await fetch(doc.file_url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "No se pudo descargar el documento" }, { status: 502 });
  }

  const buffer = new Uint8Array(await upstream.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(doc.title)}.pdf"`,
    },
  });
}
