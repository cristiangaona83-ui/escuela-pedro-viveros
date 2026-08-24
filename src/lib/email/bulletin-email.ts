import { SITE } from "@/config/site";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lowercaseFirst(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}

/**
 * Correo institucional del Informativo Semanal — HTML basado en tablas con
 * estilos en línea (la única forma de layout que los clientes de correo
 * soportan de forma confiable). El logo se referencia por su URL pública
 * del sitio (no como imagen embebida en base64: la mayoría de los clientes
 * de correo bloquea o descarta imágenes inline por seguridad/spam).
 */
export function buildBulletinEmailHtml(params: { number: number; weekLabel: string; recipientName: string }): string {
  const { number, weekLabel, recipientName } = params;
  const logoUrl = `${SITE.domains.public}/images/logo-escuela-renovado.png`;
  const viewUrl = `${SITE.domains.public}/documentos/informativos/${number}`;
  const pdfUrl = `${SITE.domains.public}/api/informativos/${number}/pdf`;
  const firstName = escapeHtml(recipientName.trim().split(/\s+/)[0] || recipientName);
  const weekLabelLower = lowercaseFirst(weekLabel);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f0f5f3;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f3;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
            <tr>
              <td style="padding:28px 32px 16px 32px;text-align:center;">
                <img src="${logoUrl}" alt="${escapeHtml(SITE.name)}" width="56" height="56" style="border-radius:10px;display:inline-block;" />
                <p style="margin:12px 0 0 0;font-size:14px;font-weight:bold;color:#213c30;">${escapeHtml(SITE.name)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:18px;font-weight:bold;color:#1c3229;">Informativo Semanal N.º ${number}</p>
                <p style="margin:6px 0 0 0;font-size:13px;color:#5c6b66;">${escapeHtml(weekLabel)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px 32px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1c2624;">Estimado/a ${firstName},</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1c2624;">
                  Compartimos el Informativo Semanal N.º ${number} de la ${escapeHtml(SITE.name)}, correspondiente a la
                  ${escapeHtml(weekLabelLower)}. Puedes revisarlo en línea o descargar el PDF institucional.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px 32px;text-align:center;">
                <a href="${viewUrl}" style="display:inline-block;background-color:#274a3a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:8px;margin:0 6px 12px 6px;">Ver informativo</a>
                <a href="${pdfUrl}" style="display:inline-block;background-color:#ffffff;color:#274a3a;text-decoration:none;font-size:14px;font-weight:bold;padding:11px 22px;border-radius:8px;border:1px solid #b8d1c4;margin:0 6px 12px 6px;">Descargar PDF</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;border-top:1px solid #dce8e2;text-align:center;">
                <p style="margin:16px 0 0 0;font-size:13px;color:#1c2624;">Saludos cordiales,<br />Dirección</p>
                <p style="margin:16px 0 0 0;font-size:11px;font-style:italic;color:#5c6b66;">${escapeHtml(SITE.slogan)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
