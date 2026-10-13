"use client";

export type PublishBulletinResult = { ok: true; pdf_url: string; signed: boolean } | { ok: false; error: string };

/** Aviso cuando el PDF se publicó pero sin la firma y el timbre del Director (no hay firma activa o no se pudo leer). */
export const UNSIGNED_BULLETIN_NOTICE =
  "El informativo se publicó, pero SIN la firma y el timbre del Director: no se pudo leer la firma institucional. Revisa Administración → Firmas y vuelve a publicarlo.";

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
    return { ok: true, pdf_url: data.pdf_url, signed: data.signed !== false };
  } catch {
    return { ok: false, error: "No se pudo publicar el informativo." };
  }
}
