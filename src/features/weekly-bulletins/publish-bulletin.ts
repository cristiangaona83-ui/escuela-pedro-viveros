"use client";

export type PublishBulletinResult = { ok: true; pdf_url: string } | { ok: false; error: string };

/** Llama al Route Handler que genera el PDF institucional y publica el informativo. Compartido entre BulletinForm y PublishBulletinButton para no duplicar la llamada. */
export async function publishBulletin(id: string): Promise<PublishBulletinResult> {
  try {
    const res = await fetch("/plataforma/api/informativos/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "No se pudo publicar el informativo." };
    return { ok: true, pdf_url: data.pdf_url };
  } catch {
    return { ok: false, error: "No se pudo publicar el informativo." };
  }
}
