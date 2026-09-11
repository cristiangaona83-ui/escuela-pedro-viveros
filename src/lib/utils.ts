import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  // Una fecha "sola" (columna `date` de Postgres, ej. "2026-09-11", sin hora)
  // NO lleva zona horaria -- pero `new Date("2026-09-11")` la interpreta como
  // medianoche UTC. Al formatear en un componente cliente, Intl usa la zona
  // horaria local del navegador (Chile, UTC-3/-4): esa medianoche UTC cae en
  // el día anterior en hora local, y la fecha se muestra un día antes de la
  // que realmente se guardó. Para una fecha "sola", se arma el Date con sus
  // componentes año/mes/día directamente (sin pasar por UTC), evitando el
  // corrimiento. Un timestamp completo (con hora) sí es un instante real y
  // sigue usando el parseo normal.
  let date: Date;
  if (typeof value === "string" && DATE_ONLY_RE.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = typeof value === "string" ? new Date(value) : value;
  }
  return new Intl.DateTimeFormat("es-CL", opts ?? { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export function formatGrade(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(1).replace(".", ",");
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** "+56 44 367 0367" -> "tel:+56443670367" para que sea clickeable en celular. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

/** "12345678-9" (formato de almacenamiento, ver StudentForm) -> "12.345.678-9". */
export function formatRun(run: string | null | undefined): string {
  if (!run) return "—";
  const clean = run.replace(/[.\s]/g, "").toUpperCase();
  const dashIndex = clean.indexOf("-");
  const body = dashIndex === -1 ? clean : clean.slice(0, dashIndex);
  const dv = dashIndex === -1 ? "" : clean.slice(dashIndex + 1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${withDots}-${dv}` : withDots;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
