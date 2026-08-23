/**
 * Catálogo de tipos de autorización y de documentos de matrícula.
 * auth_type/doc_type son texto libre en la base de datos a propósito — este
 * catálogo vive en la aplicación para poder agregar tipos nuevos sin otra
 * migración. Un tipo que no esté en esta lista igual puede guardarse
 * (código libre) y se muestra tal cual.
 */

export const AUTHORIZATION_TYPES: { code: string; label: string }[] = [
  { code: "uso_imagen", label: "Uso de imagen" },
  { code: "salidas_pedagogicas", label: "Salidas pedagógicas" },
  { code: "retiro_terceros", label: "Retiro por terceros" },
];

export function authorizationLabel(code: string): string {
  return AUTHORIZATION_TYPES.find((t) => t.code === code)?.label ?? code;
}

export const ENROLLMENT_DOC_TYPES: { code: string; label: string }[] = [
  { code: "certificado_nacimiento", label: "Certificado de nacimiento" },
  { code: "certificado_estudios_anterior", label: "Certificado de estudios anterior" },
  { code: "documentacion_matricula", label: "Documentación de matrícula" },
  { code: "autorizacion", label: "Autorización" },
];

export function enrollmentDocLabel(code: string): string {
  return ENROLLMENT_DOC_TYPES.find((t) => t.code === code)?.label ?? code;
}

export const ENROLLMENT_DOC_STATUS_LABEL: Record<string, string> = {
  solicitado: "Solicitado",
  entregado: "Entregado",
  pendiente: "Pendiente",
};
