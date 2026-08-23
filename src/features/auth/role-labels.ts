import type { RoleCode } from "@/types/database";

export const ROLE_LABELS: Record<RoleCode, string> = {
  director: "Director",
  utp: "Jefatura UTP",
  docente: "Docente",
  pie: "Coordinadora PIE",
  convivencia: "Convivencia Escolar",
  administrativo: "Administrativo",
  superadmin: "Superadministrador",
  inspectoria_general: "Inspectoría General",
  educadora_diferencial: "Educadora Diferencial",
  psicopedagoga: "Psicopedagoga",
  fonoaudiologa: "Fonoaudióloga",
  psicologo: "Psicólogo",
};
