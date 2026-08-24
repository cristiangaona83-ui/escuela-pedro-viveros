import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { BulletinDocument } from "@/lib/pdf/BulletinDocument";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import type { JSONContent } from "@tiptap/core";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;
const BUCKET = "archivos-publicos";

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para publicar informativos" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Falta el identificador del informativo" }, { status: 400 });

  const supabase = await createClient();
  const { data: bulletin, error: fetchError } = await supabase.from("weekly_bulletins").select("*").eq("id", id).maybeSingle();
  if (fetchError || !bulletin) {
    return NextResponse.json({ error: "Informativo no encontrado" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    BulletinDocument({
      number: bulletin.number,
      title: bulletin.title,
      weekLabel: bulletin.week_label,
      publishDate: bulletin.publish_date,
      content: bulletin.content as JSONContent,
    })
  );

  const path = `informativos/${bulletin.id}.pdf`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    // El PDF se sobrescribe en la misma ruta cada vez que se (re)publica —
    // a diferencia de imágenes subidas por el usuario, aquí SÍ debe quedar
    // sin caché para que una descarga nunca sirva una versión antigua.
    cacheControl: "0",
    upsert: true,
    contentType: "application/pdf",
  });
  if (uploadError) {
    console.error("[informativos/publicar] storage upload error", { message: uploadError.message, id: bulletin.id });
    return NextResponse.json({ error: "No se pudo generar el PDF del informativo" }, { status: 500 });
  }

  const pdfUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { error: updateError } = await supabase
    .from("weekly_bulletins")
    .update({ published: true, pdf_url: pdfUrl })
    .eq("id", bulletin.id);
  if (updateError) {
    console.error("[informativos/publicar] update error", {
      code: updateError.code, message: updateError.message, details: updateError.details, hint: updateError.hint, id: bulletin.id,
    });
    return NextResponse.json({ error: "No se pudo publicar el informativo" }, { status: 500 });
  }

  const { error: auditError } = await supabase.rpc("log_audit", {
    p_action: "publicar_informativo",
    p_module: "informativos",
    p_entity: "weekly_bulletins",
    p_entity_id: bulletin.id,
    p_details: { number: bulletin.number, title: bulletin.title },
  });
  if (auditError) {
    console.error("[informativos/publicar] log_audit error (informativo ya publicado, no se interrumpe)", {
      code: auditError.code, message: auditError.message,
    });
  }

  return NextResponse.json({ pdf_url: pdfUrl, published: true });
}
