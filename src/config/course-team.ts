/** Tipos compartidos por los componentes públicos de "equipo" (tarjeta de
 * persona con fotografía). Los datos de Cursos ya no viven aquí — se
 * administran desde Plataforma → Equipo institucional → Cursos y se leen
 * desde Supabase (course_teams/course_team_members/subject_teachers, ver
 * src/services/public-content.ts). */

export interface CourseTeamMember {
  fullName: string;
  role: string;
  photoSrc: string;
  /** Iniciales explícitas para el avatar cuando no hay foto. */
  initials?: string;
}
