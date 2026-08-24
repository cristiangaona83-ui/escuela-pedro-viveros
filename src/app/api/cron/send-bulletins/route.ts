import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildBulletinEmailHtml } from "@/lib/email/bulletin-email";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEND_CONCURRENCY = 5;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function next(): Promise<void> {
    const current = cursor++;
    if (current >= items.length) return;
    await worker(items[current]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

/**
 * Disparado por Vercel Cron (ver vercel.json) — nunca por el navegador ni
 * por una sesión de usuario. Protegido con CRON_SECRET: solo la
 * infraestructura de Vercel (o quien conozca el secreto) puede activarlo,
 * evitando que cualquiera dispare un envío masivo golpeando la URL.
 *
 * Usa el cliente de service_role porque no hay sesión de usuario en este
 * contexto — es exactamente el caso legítimo documentado en .env.example
 * ("scripts administrativos ejecutados en servidor").
 *
 * Idempotencia: antes de enviar a cada destinatario, se intenta "reclamar"
 * una fila en bulletin_email_log con upsert + ignoreDuplicates. La
 * restricción unique(bulletin_id, recipient_email) garantiza a nivel de
 * base de datos que dos ejecuciones solapadas (o un reintento) nunca
 * envíen el mismo informativo dos veces al mismo correo.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[cron/send-bulletins] Falta RESEND_API_KEY");
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  const fromAddress = process.env.BULLETIN_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || "Escuela Pedro Viveros Ormeño <onboarding@resend.dev>";

  const supabase = createServiceRoleClient();

  const { data: dueBulletins, error: dueError } = await supabase
    .from("weekly_bulletins")
    .select("id, number, week_label")
    .eq("published", true)
    .is("email_sent_at", null)
    .not("email_scheduled_at", "is", null)
    .lte("email_scheduled_at", new Date().toISOString());

  if (dueError) {
    console.error("[cron/send-bulletins] error consultando informativos pendientes", dueError);
    return NextResponse.json({ error: "Error consultando informativos" }, { status: 500 });
  }
  if (!dueBulletins || dueBulletins.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const { data: recipients, error: recipientsError } = await supabase
    .from("bulletin_recipients")
    .select("full_name, email")
    .eq("active", true)
    .eq("is_primary", true);

  if (recipientsError) {
    console.error("[cron/send-bulletins] error consultando destinatarios", recipientsError);
    return NextResponse.json({ error: "Error consultando destinatarios" }, { status: 500 });
  }

  const results: Array<{ bulletin_id: string; number: number; sent: number; failed: number; skipped: number }> = [];

  for (const bulletin of dueBulletins) {
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    await runPool(recipients ?? [], SEND_CONCURRENCY, async (recipient) => {
      // Reclama la fila de log antes de enviar — si ya existe (envío previo o
      // ejecución solapada), se omite sin volver a enviar.
      const { data: claimed } = await supabase
        .from("bulletin_email_log")
        .upsert(
          { bulletin_id: bulletin.id, recipient_email: recipient.email, status: "pending" },
          { onConflict: "bulletin_id,recipient_email", ignoreDuplicates: true }
        )
        .select("id");

      if (!claimed || claimed.length === 0) {
        skipped++;
        return;
      }
      const logId = claimed[0].id;

      const personalizedHtml = buildBulletinEmailHtml({ number: bulletin.number, weekLabel: bulletin.week_label, recipientName: recipient.full_name });

      try {
        const { error: sendError } = await resend.emails.send({
          from: fromAddress,
          to: [recipient.email],
          subject: `Informativo Semanal N.º ${bulletin.number} – Escuela Profesor Pedro Viveros Ormeño`,
          html: personalizedHtml,
        });

        await supabase
          .from("bulletin_email_log")
          .update({ status: sendError ? "failed" : "sent", sent_at: new Date().toISOString(), error: sendError?.message ?? null })
          .eq("id", logId);

        if (sendError) {
          console.error("[cron/send-bulletins] Resend error", { bulletin: bulletin.number, email: recipient.email, error: sendError });
          failed++;
        } else {
          sent++;
        }
      } catch (err) {
        await supabase
          .from("bulletin_email_log")
          .update({ status: "failed", sent_at: new Date().toISOString(), error: String(err) })
          .eq("id", logId);
        console.error("[cron/send-bulletins] send exception", { bulletin: bulletin.number, email: recipient.email, error: err });
        failed++;
      }
    });

    await supabase.from("weekly_bulletins").update({ email_sent_at: new Date().toISOString() }).eq("id", bulletin.id);

    await supabase.rpc("log_audit", {
      p_action: "enviar_informativo_correo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: bulletin.id,
      p_details: { number: bulletin.number, sent, failed, skipped },
    });

    results.push({ bulletin_id: bulletin.id, number: bulletin.number, sent, failed, skipped });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
