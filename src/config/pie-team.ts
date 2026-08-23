/**
 * Equipo PIE — datos reales entregados por dirección. Se publican de forma
 * estática (no se exige cargarlos primero en la plataforma pedagógica),
 * igual criterio que directive-team.ts. Orden EXACTO pedido por dirección
 * — no reordenar.
 *
 * Fotografías: ninguna de estas 8 personas tiene fotografía todavía en
 * public/images/ (se revisó antes de escribir esto, incluyendo public/,
 * public/images/ y cualquier carpeta de equipo/funcionarios existente).
 * `photoSrc` ya apunta a la ruta convencional donde debe ir cada una — la
 * página comprueba en el servidor si ese archivo ya existe
 * (equipo-pie/page.tsx, vía lib/staff-photo.ts) y muestra un avatar con
 * iniciales mientras no exista. Para publicar una foto real, basta con
 * colocar el archivo exactamente en esa ruta dentro de public/images/staff/
 * y volver a desplegar — no hace falta tocar código.
 */

export interface PieTeamMember {
  fullName: string;
  role: string;
  photoSrc: string;
}

export const PIE_TEAM: PieTeamMember[] = [
  { fullName: "Carmen Acuña", role: "Coordinadora PIE", photoSrc: "/images/staff/carmen-acuna.jpg" },
  { fullName: "Katherine Carrión Henríquez", role: "Psicopedagoga", photoSrc: "/images/staff/katherine-carrion.jpg" },
  { fullName: "Marcela Hernández Donoso", role: "Psicopedagoga", photoSrc: "/images/staff/marcela-hernandez.jpg" },
  { fullName: "Yesika Morales Lizama", role: "Educadora Diferencial", photoSrc: "/images/staff/yesika-morales.jpg" },
  { fullName: "Elizabeth Álvarez Silva", role: "Educadora Diferencial", photoSrc: "/images/staff/elizabeth-alvarez.jpg" },
  { fullName: "Cristian Saavedra Berrueta", role: "Psicólogo", photoSrc: "/images/staff/cristian-saavedra.jpg" },
  { fullName: "Daniela Vera Menares", role: "Fonoaudióloga", photoSrc: "/images/staff/daniela-vera.jpg" },
  { fullName: "Adhara Jiménez Machuca", role: "Técnico en Educación Especial", photoSrc: "/images/staff/adhara-jimenez.jpg" },
];
