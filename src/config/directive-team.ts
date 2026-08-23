/**
 * Equipo Directivo — datos reales entregados por dirección. Se publican de
 * forma estática (no se exige cargarlos primero en la plataforma pedagógica)
 * porque son datos institucionales estables, igual criterio que
 * institutional-content.ts.
 *
 * Fotografías: ninguna de estas 5 personas tiene fotografía todavía en
 * public/images/ (se revisó antes de escribir esto). `photoSrc` ya apunta a
 * la ruta convencional donde debe ir cada una — la página comprueba en el
 * servidor si ese archivo ya existe (equipo-directivo/page.tsx) y muestra
 * un avatar con iniciales mientras no exista. Para publicar una foto real,
 * basta con colocar el archivo exactamente en esa ruta dentro de
 * public/images/staff/ y volver a desplegar — no hace falta tocar código.
 */

export interface DirectiveTeamMember {
  fullName: string;
  role: string;
  photoSrc: string;
}

export const DIRECTIVE_TEAM: DirectiveTeamMember[] = [
  { fullName: "Cristian Fernando Gaona Villena", role: "Director", photoSrc: "/images/staff/cristian-gaona.png" },
  { fullName: "Carolina del Carmen Saavedra Rojas", role: "Jefa de UTP", photoSrc: "/images/staff/carolina-saavedra.jpg" },
  { fullName: "Elizabeth del Pilar Acevedo Silva", role: "Inspectora General", photoSrc: "/images/staff/elizabeth-acevedo.jpg" },
  // Cargo exacto pedido por dirección — no usar "Encargada de Convivencia" ni "Convivencia Escolar".
  { fullName: "Claudia Andrea Espinoza López", role: "Coordinadora de Convivencia Educativa", photoSrc: "/images/staff/claudia-espinoza.jpg" },
  { fullName: "Carmen Gloria Acuña Tobar", role: "Coordinadora PIE", photoSrc: "/images/staff/carmen-acuna.jpg" },
];
