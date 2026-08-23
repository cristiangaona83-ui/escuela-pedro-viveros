/**
 * Asistentes de la Educación — datos reales entregados por dirección,
 * organizados por área. Se publican de forma estática, igual criterio que
 * directive-team.ts / pie-team.ts / course-team.ts.
 *
 * No duplicar personas: las asistentes de aula ya están cargadas en
 * course-team.ts (una por curso) — esta página las reutiliza desde ahí
 * (courseAssistants()) en vez de repetir su nombre/cargo/foto aquí.
 *
 * Categorías sin integrantes confirmados NO se listan en STATIC_STAFF —
 * getSupportStaffCategories() ya las omite automáticamente de la página
 * mientras estén vacías (sin mensajes de "en preparación").
 */

import { COURSE_TEAM, type CourseTeamMember } from "./course-team";

export type SupportStaffMember = CourseTeamMember;

export type SupportStaffCategoryKey =
  | "apoyo_educativo"
  | "salud_bienestar"
  | "apoyo_administrativo"
  | "auxiliares_servicios";

const CATEGORY_LABELS: Record<SupportStaffCategoryKey, string> = {
  apoyo_educativo: "Apoyo educativo",
  salud_bienestar: "Salud y bienestar",
  apoyo_administrativo: "Apoyo administrativo y de funcionamiento",
  auxiliares_servicios: "Auxiliares de Servicios",
};

// Funcionarios propios de esta página (no confirmados en ningún otro
// archivo todavía). No inventar nombres — agregar aquí solo cuando
// dirección los entregue.
const STATIC_STAFF: Record<SupportStaffCategoryKey, SupportStaffMember[]> = {
  apoyo_educativo: [],
  salud_bienestar: [],
  apoyo_administrativo: [],
  auxiliares_servicios: [],
};

function courseAssistants(): SupportStaffMember[] {
  return COURSE_TEAM.filter((c): c is typeof c & { assistant: SupportStaffMember } => Boolean(c.assistant)).map(
    (c) => c.assistant
  );
}

export interface SupportStaffCategory {
  key: SupportStaffCategoryKey;
  label: string;
  members: SupportStaffMember[];
}

/** Solo devuelve categorías con al menos un integrante confirmado. */
export function getSupportStaffCategories(): SupportStaffCategory[] {
  const merged: Record<SupportStaffCategoryKey, SupportStaffMember[]> = {
    ...STATIC_STAFF,
    apoyo_educativo: [...STATIC_STAFF.apoyo_educativo, ...courseAssistants()],
  };

  return (Object.keys(CATEGORY_LABELS) as SupportStaffCategoryKey[])
    .map((key) => ({ key, label: CATEGORY_LABELS[key], members: merged[key] }))
    .filter((category) => category.members.length > 0);
}
