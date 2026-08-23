/**
 * Datos institucionales centralizados.
 * Único lugar donde se hardcodean datos confirmados de la escuela.
 * Los campos en null/"" están pendientes de entrega oficial: no inventar valores.
 * Cuando existan, reemplazar aquí o migrar a la tabla `school_config` (administrable desde la plataforma).
 */

export const SITE = {
  name: "Escuela Profesor Pedro Viveros Ormeño",
  shortName: "Escuela Pedro Viveros Ormeño",
  slogan: "Educamos para aprender, convivir y construir nuevas oportunidades.",
  director: "Cristian Fernando Gaona Villena",
  utpName: "Carolina Saavedra Rojas",
  address: {
    street: "Los Copihues 1033",
    neighborhood: "Tejas Verdes",
    city: "Llolleo, San Antonio",
    region: "Región de Valparaíso",
    country: "Chile",
    full: "Los Copihues 1033, Tejas Verdes, Llolleo, San Antonio, Región de Valparaíso, Chile",
  },
  // Pendiente de entrega oficial — no inventar.
  rbd: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  schedule: null as string | null,
  socials: {
    facebook: null as string | null,
    instagram: null as string | null,
    youtube: null as string | null,
  },
  domains: {
    public: "https://www.escuelapedroviveros.cl",
    platform: "https://plataforma.escuelapedroviveros.cl",
  },
  mapsQuery: "Los Copihues 1033, Tejas Verdes, Llolleo, San Antonio, Chile",
} as const;

export const PLATFORM_NAME = "Plataforma Pedagógica PVO";
