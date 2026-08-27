import { createClient } from "@/lib/supabase/server";
import type {
  ContentCardRow,
  ContentCardSection,
  CourseRow,
  CourseTeamMemberRow,
  CourseTeamRow,
  DocumentRow,
  GalleryRow,
  NewsRow,
  StaffMemberRow,
  StaffSection,
  StaffSectionMembershipRow,
  SubjectTeacherRow,
  WeeklyBulletinRow,
} from "@/types/database";
import { STATIC_INSTITUTIONAL_DOCUMENTS } from "@/config/institutional-documents";
import { STATIC_CONTENT_CARDS } from "@/config/institutional-content";

export type StaffSectionMember = StaffSectionMembershipRow & { staff_member: StaffMemberRow };
export type CourseTeamWithMembers = CourseTeamRow & {
  members: (CourseTeamMemberRow & { staff_member: StaffMemberRow })[];
};
export type SubjectTeacherWithStaff = SubjectTeacherRow & { staff_member: StaffMemberRow };

/**
 * Capa de acceso a datos del sitio público. Todas las funciones son
 * tolerantes a fallos (proyecto Supabase aún no conectado, sin datos, etc.)
 * y devuelven listas vacías en vez de romper el render — el sitio nunca
 * debe mostrar errores ni placeholders de contenido inexistente.
 */

export async function getPublishedNews(limit?: number): Promise<NewsRow[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("news")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function getGallery(): Promise<GalleryRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .eq("published", true)
      .order("event_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPublishedBulletins(): Promise<WeeklyBulletinRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("weekly_bulletins")
      .select("*")
      .eq("published", true)
      .order("number", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPublishedBulletinByNumber(number: number): Promise<WeeklyBulletinRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("weekly_bulletins")
      .select("*")
      .eq("number", number)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

const STATIC_DOCUMENT_ROWS: DocumentRow[] = STATIC_INSTITUTIONAL_DOCUMENTS.map((doc) => ({
  ...doc,
  is_public: true,
  uploaded_by: null,
  created_at: new Date(0).toISOString(),
}));

export async function getPublicDocuments(): Promise<DocumentRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("is_public", true)
      .order("year", { ascending: false });
    if (error) throw error;
    return [...STATIC_DOCUMENT_ROWS, ...(data ?? [])];
  } catch {
    return STATIC_DOCUMENT_ROWS;
  }
}

/** Personas activas de una sección (Equipo Directivo / Equipo PIE / Asistentes
 * de la Educación), con su registro central de persona (foto/nombre) unido. */
export async function getStaffSection(section: StaffSection): Promise<StaffSectionMember[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff_section_memberships")
      .select("*, staff_member:staff_members(*)")
      .eq("section", section)
      .eq("active", true)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (data as unknown as StaffSectionMember[]) ?? [];
  } catch {
    return [];
  }
}

/** Cursos activos con su docente de jefatura y, cuando corresponde, asistente de aula. */
export async function getPublicCourseTeams(): Promise<CourseTeamWithMembers[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_teams")
      .select("*, members:course_team_members(*, staff_member:staff_members(*))")
      .eq("active", true)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (data as unknown as CourseTeamWithMembers[]) ?? [];
  } catch {
    return [];
  }
}

/** Docentes de asignatura activos (lista global, no atada a un curso). */
export async function getSubjectTeachersPublic(): Promise<SubjectTeacherWithStaff[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subject_teachers")
      .select("*, staff_member:staff_members(*)")
      .eq("active", true)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (data as unknown as SubjectTeacherWithStaff[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPublicCourses(): Promise<(CourseRow & { homeroom_teacher?: { full_name: string } | null })[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*, homeroom_teacher:profiles!courses_homeroom_teacher_id_fkey(full_name)")
      .eq("public_visible", true)
      .eq("active", true)
      .order("level", { ascending: true });
    if (error) throw error;
    return (data as unknown as (CourseRow & { homeroom_teacher?: { full_name: string } | null })[]) ?? [];
  } catch {
    return [];
  }
}

/** Tarjetas activas de una sección (Destacados de Inicio, Sellos o Valores de Nuestra Escuela). Respaldo estático si la tabla falla o está vacía. */
export async function getContentCards(section: ContentCardSection): Promise<ContentCardRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_cards")
      .select("*")
      .eq("section", section)
      .eq("active", true)
      .order("order_index", { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch {
    // sigue al respaldo estático
  }
  const now = new Date(0).toISOString();
  return STATIC_CONTENT_CARDS[section].map((c, i) => ({
    id: `static-${section}-${i}`,
    section,
    title: c.title,
    description: c.description,
    icon: c.icon ?? null,
    href: c.href ?? null,
    order_index: i,
    active: true,
    created_at: now,
    updated_at: now,
  }));
}

export async function submitContactMessage(input: {
  full_name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(input);
  if (error) throw error;
}
