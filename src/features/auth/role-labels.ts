import type { RoleCode } from "@/types/database";

export const ROLE_LABELS: Record<RoleCode, string> = {
  director: "Director",
  utp: "Jefatura UTP",
  docente: "Docente",
  pie: "Equipo PIE",
  convivencia: "Convivencia Escolar",
  administrativo: "Administrativo",
  superadmin: "Superadministrador",
};
