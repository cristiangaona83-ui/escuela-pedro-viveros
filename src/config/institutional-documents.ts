/**
 * Documentos institucionales reales entregados por la dirección, servidos
 * como archivos estáticos mientras se migran a Supabase Storage. Se
 * combinan con los documentos cargados desde la plataforma (tabla
 * `documents`) en la sección pública de Documentos Institucionales.
 */
export const STATIC_INSTITUTIONAL_DOCUMENTS = [
  {
    id: "static-pei",
    title: "Proyecto Educativo Institucional (PEI)",
    category: "PEI",
    year: null as number | null,
    description: "Proyecto Educativo Institucional de la Escuela Profesor Pedro Viveros Ormeño.",
    file_url: "/documents/proyecto-educativo-institucional.pdf",
  },
  {
    id: "static-reglamento-interno",
    title: "Reglamento Interno",
    category: "Reglamento",
    year: null as number | null,
    description: "Reglamento Interno del establecimiento.",
    file_url: "/documents/reglamento-interno.pdf",
  },
  {
    id: "static-reglamento-evaluacion",
    title: "Reglamento de Evaluación",
    category: "Reglamento",
    year: null as number | null,
    description: "Reglamento de Evaluación, Calificación y Promoción.",
    file_url: "/documents/reglamento-evaluacion.pdf",
  },
];
