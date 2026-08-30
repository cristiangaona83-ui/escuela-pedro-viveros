import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getBulletinById } from "@/services/weekly-bulletins-admin";
import { BulletinDocument, type BulletinPageSize } from "@/lib/pdf/BulletinDocument";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import type { JSONContent } from "@tiptap/core";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

/**
 * Genera el PDF del informativo al vuelo, con el tamaño de hoja elegido por
 * el usuario (Carta u Oficio) -- a diferencia de /plataforma/api/informativos/
 * publicar, esta ruta NO escribe nada en la base de datos ni en Storage: es
 * solo para vista previa/impresión desde el panel, sirve tanto para
 * borradores como para informativos ya publicados, y nunca reemplaza el PDF
 * oficial archivado al publicar.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para imprimir este informativo" }, { status: 403 });
  }

  const { id } = await params;
  const bulletin = await getBulletinById(id);
  if (!bulletin) return NextResponse.json({ error: "Informativo no encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const pageSize: BulletinPageSize = body.pageSize === "oficio" ? "oficio" : "carta";

  const buffer = await renderToBuffer(
    BulletinDocument({
      number: bulletin.number,
      title: bulletin.title,
      weekLabel: bulletin.week_label,
      publishDate: bulletin.publish_date,
      content: bulletin.content as JSONContent,
      pageSize,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informativo-${bulletin.number}-${pageSize}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
