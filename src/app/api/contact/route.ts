import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Destinatario fijo — nunca se toma del formulario.
const RECIPIENT = "epviveros@gmail.com";

const contactSchema = z.object({
  full_name: z.string().trim().min(2, "Nombre muy corto").max(200),
  email: z.string().trim().email("Correo inválido").max(200),
  phone: z.string().trim().max(50).optional(),
  subject: z.string().trim().min(2, "Asunto requerido").max(200),
  message: z.string().trim().min(5, "Mensaje muy corto").max(5000),
});

// Quita caracteres de control (nunca HTML — el correo se envía como texto
// plano, así que no hay riesgo de inyección de HTML en el cuerpo). Los
// campos de una sola línea (nombre, correo, teléfono, asunto) también
// pierden salto de línea/retorno de carro, para que nadie pueda inyectar
// una línea falsa dentro del asunto del correo.
const CONTROL_CHARS_REGEX = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "g");

function cleanLine(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, "").replace(/[\r\n]+/g, " ").trim();
}

function cleanBody(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, "");
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Ya enviaste una consulta hace muy poco. Intenta nuevamente en unos segundos." }, { status: 429 });
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

  // Honeypot: campo invisible para personas, casi siempre completado por
  // bots. Si llega con contenido, se responde éxito sin enviar nada, para
  // no delatar el mecanismo.
  if (typeof record.website === "string" && record.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  // Consentimiento obligatorio — se valida aparte del esquema de texto.
  if (record.consent !== true) {
    return NextResponse.json({ error: "Debes confirmar el consentimiento para enviar la consulta." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(record);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });
  }
  const data = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[api/contact] Falta RESEND_API_KEY — no se puede enviar el correo");
    return NextResponse.json({ error: "El servicio de correo no está configurado todavía." }, { status: 500 });
  }

  const fromAddress = process.env.CONTACT_FROM_EMAIL || "Escuela Pedro Viveros Ormeño <onboarding@resend.dev>";
  const sentAt = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "short" });

  const textBody = [
    `Nombre: ${cleanLine(data.full_name)}`,
    `Correo: ${cleanLine(data.email)}`,
    `Teléfono: ${data.phone ? cleanLine(data.phone) : "No indicado"}`,
    `Asunto: ${cleanLine(data.subject)}`,
    "",
    "Mensaje:",
    cleanBody(data.message),
    "",
    `Fecha/hora de envío: ${sentAt}`,
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: RECIPIENT,
      replyTo: data.email,
      subject: `[Consulta Web EPVO] ${cleanLine(data.subject)}`,
      text: textBody,
    });
    if (error) {
      console.error("[api/contact] Resend error", error);
      return NextResponse.json({ error: "No pudimos enviar tu consulta." }, { status: 502 });
    }
  } catch (err) {
    console.error("[api/contact] send failed", err);
    return NextResponse.json({ error: "No pudimos enviar tu consulta." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
