import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulletinFileBaseName } from "@/lib/bulletin-content";

export const runtime = "nodejs";

const BUCKET = "archivos-publicos";

/**
 * Descarga del PDF de un informativo, con nombre de archivo legible.
 * Sin restricción de rol propia: la visibilidad la decide RLS a través del
 * cliente ligado a la sesión (anon solo ve published=true; el personal
 * autenticado ve todos) — mismo mecanismo que el resto de la plataforma, así
 * que este único endpoint sirve tanto a la página pública como al panel.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const parsedNumber = Number(number);
  if (!Number.isInteger(parsedNumber)) {
    return NextResponse.json({ error: "Informativo no encontrado" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: bulletin } = await supabase
    .from("weekly_bulletins")
    .select("id, number, week_label, pdf_url")
    .eq("number", parsedNumber)
    .maybeSingle();

  if (!bulletin || !bulletin.pdf_url) {
    return NextResponse.json({ error: "El PDF de este informativo aún no está disponible" }, { status: 404 });
  }

  const path = `informativos/${bulletin.id}.pdf`;
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !blob) {
    return NextResponse.json({ error: "No se pudo descargar el PDF" }, { status: 500 });
  }

  const buffer = new Uint8Array(await blob.arrayBuffer());
  const filename = `${bulletinFileBaseName(bulletin)}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
