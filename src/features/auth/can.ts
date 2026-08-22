import type { RoleCode } from "@/types/database";

/**
 * Verificación de rol en la UI (mostrar/ocultar formularios y acciones de
 * escritura). Es una capa de defensa adicional, no la protección real — esa
 * la sigue haciendo RLS en la base de datos. Sin dependencias de servidor:
 * seguro de importar tanto en Server como en Client Components.
 */
export function canWrite(roles: RoleCode[], allowed: RoleCode[]): boolean {
  return roles.some((r) => allowed.includes(r));
}
