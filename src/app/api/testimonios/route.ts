import { NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const testimonialSchema = z.object({
  full_name: z.string().trim().min(2, "Nombre muy corto").max(200),
  relationship: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, "Cuéntanos un poco más").max(3000),
});

/** Quita caracteres de control -- el mensaje se muestra tal cual en el sitio
 * público más adelante (tras aprobación), como texto plano en JSX (React
 * escapa HTML automáticamente), así que no hay riesgo de inyección; esto
 * solo evita basura de control invisible en el texto guardado. */
const CONTROL_CHARS_REGEX = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "g");
function clean(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, "").trim();
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`testimonio:${ip}`)) {
    return NextResponse.json({ error: "Ya enviaste un comentario hace muy poco. Intenta nuevamente en unos segundos." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;

  // Honeypot: igual que /api/contact -- si viene relleno, es un bot; se
  // responde éxito sin guardar nada, para no delatar el mecanismo.
  if (typeof record.website === "string" && record.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (record.consent !== true) {
    return NextResponse.json({ error: "Debes confirmar el consentimiento para publicar tu comentario." }, { status: 400 });
  }

  const parsed = testimonialSchema.safeParse(record);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").insert({
    full_name: clean(data.full_name),
    relationship: data.relationship ? clean(data.relationship) : null,
    message: clean(data.message),
  });

  if (error) {
    console.error("[api/testimonios] insert failed", error);
    return NextResponse.json({ error: "No pudimos guardar tu comentario." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
