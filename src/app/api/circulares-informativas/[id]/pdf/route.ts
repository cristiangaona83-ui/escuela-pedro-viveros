import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Descarga con nombre de archivo legible para Circulares Informativas
 * públicas -- mismo patrón que /api/documentos/[id]/pdf (proxy del archivo
 * en Storage, nunca la ruta técnica ni el UUID en el nombre descargado).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: circular } = await supabase
    .from("circulares_informativas")
    .select("title, document_number, file_url, visible")
    .eq("id", id)
    .eq("visible", true)
    .maybeSingle();

  if (!circular) {
    return NextResponse.json({ error: "Circular no encontrada" }, { status: 404 });
  }

  const upstream = await fetch(circular.file_url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "No se pudo descargar la circular" }, { status: 502 });
  }

  const namePrefix = circular.document_number ? `Circular_${circular.document_number}_` : "Circular_";
  const buffer = new Uint8Array(await upstream.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namePrefix}${slugify(circular.title)}.pdf"`,
    },
  });
}
