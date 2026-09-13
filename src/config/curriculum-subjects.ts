/**
 * Orden oficial de asignaturas del Plan de Estudio de Enseñanza Básica, por
 * ciclo -- así los certificados (Semestral, Anual, Cierre de Año) siempre
 * muestran las asignaturas en el mismo orden curricular, no alfabético.
 * Cualquier asignatura que no calce con ningún nombre de estas listas (ej.
 * una asignatura nueva del colegio, o mal escrita en el catálogo) se agrega
 * al final, en orden alfabético, para no ocultar ninguna nota por un
 * desajuste de nombre.
 */

const CYCLE_1_TO_4 = [
  "Lenguaje y Comunicación",
  "Matemática",
  "Historia, Geografía y Ciencias Sociales",
  "Ciencias Naturales",
  "Artes Visuales",
  "Música",
  "Educación Física y Salud",
  "Tecnología",
];

const CYCLE_5_TO_6 = [...CYCLE_1_TO_4, "Idioma Extranjero: Inglés"];

const CYCLE_7_TO_8 = [
  "Lengua y Literatura",
  "Matemática",
  "Historia, Geografía y Ciencias Sociales",
  "Ciencias Naturales",
  "Artes Visuales y Música",
  "Educación Física y Salud",
  "Tecnología",
  "Idioma Extranjero: Inglés",
];

/**
 * Asignaturas que se evalúan y aparecen en Evaluaciones/Calificaciones, pero
 * que NO se consideran en los certificados oficiales (Semestral, Anual,
 * Cierre de Año) ni en el promedio general -- Orientación, según el
 * Certificado Anual de Estudio oficial usado como referencia, no figura como
 * calificación en ese documento. No afecta Carga Docente, Evaluaciones ni
 * Calificaciones: solo se filtra al armar los certificados (ver
 * buildSubjectReport en services/report-data.ts).
 */
export const SUBJECTS_EXCLUDED_FROM_REPORTS = new Set(["Orientación"]);

/** "5° Básico" -> 5. Solo reconoce niveles de Enseñanza Básica (1° a 8°). */
function basicaGrade(level: string): number | null {
  const match = level.match(/^(\d)°?\s*Básico$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= 8 ? n : null;
}

/** Lista ordenada de nombres de asignatura del Plan de Estudio para el ciclo de `level` ([] si `level` no es de Enseñanza Básica). */
export function officialSubjectOrder(level: string): string[] {
  const grade = basicaGrade(level);
  if (grade === null) return [];
  if (grade <= 4) return CYCLE_1_TO_4;
  if (grade <= 6) return CYCLE_5_TO_6;
  return CYCLE_7_TO_8;
}

/** Ordena `rows` según el Plan de Estudio del ciclo de `level`; las que no calcen con ningún nombre oficial van al final, alfabéticamente. */
export function sortByOfficialSubjectOrder<T extends { subjectName: string }>(rows: T[], level: string): T[] {
  const order = officialSubjectOrder(level);
  const indexOf = new Map(order.map((name, i) => [name, i]));
  return [...rows].sort((a, b) => {
    const ia = indexOf.get(a.subjectName) ?? order.length;
    const ib = indexOf.get(b.subjectName) ?? order.length;
    if (ia !== ib) return ia - ib;
    return a.subjectName.localeCompare(b.subjectName);
  });
}
