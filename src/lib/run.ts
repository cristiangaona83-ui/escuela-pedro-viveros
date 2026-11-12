/** "12.345.678-5" / "123456785" -> "12345678-5" (formato de almacenamiento, ver StudentForm). "" si no hay nada. */
export function cleanRun(value: string | null | undefined): string {
  const clean = (value ?? "").replace(/[.\s-]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

/** Valida un RUN chileno (cuerpo numérico + dígito verificador, módulo 11). */
export function isValidRun(value: string | null | undefined): boolean {
  const run = cleanRun(value);
  const match = /^(\d{6,9})-([\dK])$/.exec(run);
  if (!match) return false;
  let sum = 0;
  let factor = 2;
  for (let i = match[1].length - 1; i >= 0; i--) {
    sum += Number(match[1][i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  const dv = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return dv === match[2];
}
