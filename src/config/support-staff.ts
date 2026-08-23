/**
 * Asistentes de la Educación — datos reales entregados por dirección,
 * organizados por área. Se publican de forma estática, igual criterio que
 * directive-team.ts / pie-team.ts / course-team.ts.
 *
 * Esta página NUNCA reutiliza ni muestra a las asistentes de aula — esas
 * personas ya están publicadas dentro de su curso en course-team.ts /
 * Nuestros Cursos, y no deben duplicarse aquí. "Apoyo educativo" se deja
 * vacía a propósito hasta que exista personal de apoyo educativo distinto
 * al de aula.
 *
 * Categorías sin integrantes confirmados NO se listan en STATIC_STAFF —
 * getSupportStaffCategories() ya las omite automáticamente de la página
 * mientras estén vacías (sin mensajes de "en preparación").
 */

export interface SupportStaffMember {
  fullName: string;
  role: string;
  photoSrc: string;
  /** Iniciales explícitas para el avatar cuando no hay foto — el cálculo
   * automático (primera + última palabra) no siempre coincide con nombre +
   * apellido paterno real. */
  initials?: string;
}

export type SupportStaffCategoryKey =
  | "apoyo_educativo"
  | "salud_bienestar"
  | "apoyo_administrativo"
  | "auxiliares_servicios";

const CATEGORY_LABELS: Record<SupportStaffCategoryKey, string> = {
  apoyo_educativo: "Apoyo educativo",
  salud_bienestar: "Salud y Bienestar",
  apoyo_administrativo: "Apoyo administrativo y de funcionamiento",
  auxiliares_servicios: "Auxiliares de Servicios",
};

// Funcionarios propios de esta página. No inventar nombres — agregar aquí
// solo cuando dirección los entregue. Nunca incluir asistentes de aula
// (esas ya están en course-team.ts / Nuestros Cursos).
const STATIC_STAFF: Record<SupportStaffCategoryKey, SupportStaffMember[]> = {
  apoyo_educativo: [],
  salud_bienestar: [
    {
      fullName: "Andrea Lorena Bustos Carreño",
      role: "Técnico en Enfermería de Nivel Superior (TENS)",
      photoSrc: "/images/staff/andrea-bustos.jpg",
      initials: "AB",
    },
  ],
  apoyo_administrativo: [],
  auxiliares_servicios: [
    {
      fullName: "Claudio Andrés Bazán Espinoza",
      role: "Auxiliar de Servicios",
      photoSrc: "/images/staff/claudio-bazan.jpg",
      initials: "CB",
    },
    {
      fullName: "Elena Andrea Vidal Quiroz",
      role: "Auxiliar de Servicios",
      photoSrc: "/images/staff/elena-vidal.jpg",
      initials: "EV",
    },
  ],
};

export interface SupportStaffCategory {
  key: SupportStaffCategoryKey;
  label: string;
  members: SupportStaffMember[];
}

/** Solo devuelve categorías con al menos un integrante confirmado. */
export function getSupportStaffCategories(): SupportStaffCategory[] {
  return (Object.keys(CATEGORY_LABELS) as SupportStaffCategoryKey[])
    .map((key) => ({ key, label: CATEGORY_LABELS[key], members: STATIC_STAFF[key] }))
    .filter((category) => category.members.length > 0);
}
