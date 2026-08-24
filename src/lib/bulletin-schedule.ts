export const SCHEDULE_TIMEZONE = "America/Santiago";
export const DEFAULT_SCHEDULE_TIME = "08:00";

/**
 * Convierte una fecha/hora "de pared" en America/Santiago (lo que el
 * usuario elige en el formulario) a un instante UTC real, sin asumir un
 * offset fijo (Chile ha cambiado sus reglas de horario de verano varias
 * veces) y sin depender de la zona horaria local del proceso que ejecuta
 * este código (el truco habitual de "reparsear un string localizado" falla
 * si el proceso ya corre en esa misma zona, porque `Date` interpreta el
 * string reparseado en la zona local del sistema, no en UTC). En cambio,
 * se le pregunta directamente a `Intl` el offset GMT de la zona en esa
 * fecha concreta (con `timeZoneName: "longOffset"`), que sí usa la tzdata
 * real de Node sin ambigüedad.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string = SCHEDULE_TIMEZONE): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const reference = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(reference);
  const offsetLabel = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = offsetLabel.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const sign = match?.[1] === "-" ? -1 : 1;
  const offsetMs = match ? sign * (Number(match[2]) * 60 + Number(match[3] ?? "0")) * 60_000 : 0;

  return new Date(reference.getTime() - offsetMs);
}

/** "lunes 24 de agosto de 2026 a las 08:00 hrs." en America/Santiago, a partir de un timestamptz UTC. */
export function formatScheduleLabel(isoValue: string): string {
  const date = new Date(isoValue);
  const datePart = new Intl.DateTimeFormat("es-CL", {
    timeZone: SCHEDULE_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("es-CL", {
    timeZone: SCHEDULE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} a las ${timePart} hrs.`;
}

/** Valor por defecto del selector de fecha (hoy, en America/Santiago) en formato YYYY-MM-DD. */
export function todayInSantiago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHEDULE_TIMEZONE }).format(new Date());
}
