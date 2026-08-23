/**
 * Cursos / Nuestros Cursos — datos reales entregados por dirección. Se
 * publican de forma estática (no se exige cargarlos desde la plataforma
 * pedagógica ni desde teacher_assignments/courses en Supabase), igual
 * criterio que directive-team.ts y pie-team.ts. Esta lista es independiente
 * de las jefaturas reales en la base de datos — es contenido del sitio
 * público, no un espejo de la plataforma.
 *
 * Fotografías: ninguna de estas 14 personas (10 docentes de jefatura + 4
 * asistentes de aula) tiene fotografía todavía en public/images/staff/ (se
 * revisó antes de escribir esto). `photoSrc` ya apunta a la ruta
 * convencional donde debe ir cada una — la página comprueba en el servidor
 * si ese archivo ya existe (cursos/page.tsx, vía lib/staff-photo.ts) y
 * muestra un avatar con iniciales mientras no exista. Para publicar una
 * foto real, basta con colocar el archivo exactamente en esa ruta y volver
 * a desplegar — no hace falta tocar código.
 *
 * Solo 4 cursos tienen asistente de aula confirmado (Prekínder, Kínder,
 * 1° y 2° Básico) — el resto queda sin campo `assistant` a propósito, no
 * se inventa ni se marca "sin asistente".
 */

export interface CourseTeamMember {
  fullName: string;
  role: string;
  photoSrc: string;
}

export interface CourseTeamEntry {
  courseName: string;
  homeroomTeacher: CourseTeamMember;
  assistant?: CourseTeamMember;
}

export const COURSE_TEAM: CourseTeamEntry[] = [
  {
    courseName: "Prekínder",
    homeroomTeacher: { fullName: "Claudia Marcela Galarce Bustos", role: "Educadora / Jefatura de curso", photoSrc: "/images/staff/claudia-galarce.jpg" },
    assistant: { fullName: "María Patricia Ortiz Martínez", role: "Asistente de Aula", photoSrc: "/images/staff/maria-ortiz.jpg" },
  },
  {
    courseName: "Kínder",
    homeroomTeacher: { fullName: "Lucero Rivera Ortega", role: "Educadora / Jefatura de curso", photoSrc: "/images/staff/lucero-rivera.jpg" },
    assistant: { fullName: "Fernanda Camilla Pereira", role: "Asistente de Aula", photoSrc: "/images/staff/fernanda-pereira.jpg" },
  },
  {
    courseName: "1° Básico",
    homeroomTeacher: { fullName: "Leyla del Alba Flores Jorquera", role: "Profesora Jefe", photoSrc: "/images/staff/leyla-flores.jpg" },
    assistant: { fullName: "Jennifer Campos Fuentes", role: "Asistente de Aula", photoSrc: "/images/staff/jennifer-campos.jpg" },
  },
  {
    courseName: "2° Básico",
    homeroomTeacher: { fullName: "Carmen Paulina Miranda Valdés", role: "Profesora Jefe", photoSrc: "/images/staff/carmen-miranda.jpg" },
    assistant: { fullName: "Carolina Gómez Durán", role: "Asistente de Aula", photoSrc: "/images/staff/carolina-gomez.jpg" },
  },
  {
    courseName: "3° Básico",
    homeroomTeacher: { fullName: "María Soledad Cienfuegos Marín", role: "Profesora Jefe", photoSrc: "/images/staff/maria-cienfuegos.jpg" },
  },
  {
    courseName: "4° Básico",
    homeroomTeacher: { fullName: "Claudia Hernández Henríquez", role: "Profesora Jefe", photoSrc: "/images/staff/claudia-hernandez.jpg" },
  },
  {
    courseName: "5° Básico",
    homeroomTeacher: { fullName: "Maribel Consuelo Olivos Plaza", role: "Profesora Jefe", photoSrc: "/images/staff/maribel-olivos.jpg" },
  },
  {
    courseName: "6° Básico",
    homeroomTeacher: { fullName: "Pamela Alejandra Urtubia Echeverría", role: "Profesora Jefe", photoSrc: "/images/staff/pamela-urtubia.jpg" },
  },
  {
    courseName: "7° Básico",
    homeroomTeacher: { fullName: "Evelyn Ivonne Carrasco Oyanedel", role: "Profesora Jefe", photoSrc: "/images/staff/evelyn-carrasco.jpg" },
  },
  {
    courseName: "8° Básico",
    homeroomTeacher: { fullName: "Sebastián Antonio Vergara Moraga", role: "Profesor Jefe", photoSrc: "/images/staff/sebastian-vergara.jpg" },
  },
];
