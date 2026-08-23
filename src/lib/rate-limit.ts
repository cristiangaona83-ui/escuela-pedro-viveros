/**
 * Límite de envío muy simple, en memoria — un intento cada WINDOW_MS por
 * IP. No es un rate limit distribuido (se reinicia en cada despliegue y no
 * se comparte entre instancias), pero cubre el caso real de un formulario
 * público sin agregar infraestructura nueva (Redis/Upstash) que este
 * proyecto no tiene.
 */
const WINDOW_MS = 30_000;
const hits = new Map<string, number>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const last = hits.get(key);
  if (last !== undefined && now - last < WINDOW_MS) return true;
  hits.set(key, now);

  if (hits.size > 5000) {
    for (const [k, t] of hits) {
      if (now - t > WINDOW_MS) hits.delete(k);
    }
  }
  return false;
}
