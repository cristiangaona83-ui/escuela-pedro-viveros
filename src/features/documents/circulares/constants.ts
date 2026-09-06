/**
 * Sin dependencias de servidor (a diferencia de services/documents.ts, que
 * importa @/lib/supabase/server) -- así un componente cliente puede
 * importar esta categoría sin arrastrar next/headers al bundle del
 * navegador. Mismo motivo/patrón que src/features/seguro-escolar/utils.ts.
 */
export const CIRCULARES_CATEGORY = "circulares_informativas";
