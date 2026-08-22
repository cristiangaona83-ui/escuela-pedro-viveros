import { createClient } from "@/lib/supabase/server";
import type { CourseRow, DocumentRow, GalleryRow, NewsRow, StaffMemberRow } from "@/types/database";
import { STATIC_INSTITUTIONAL_DOCUMENTS } from "@/config/institutional-documents";

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

export async function getStaffByArea(area: StaffMemberRow["area"]): Promise<StaffMemberRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff_members")
      .select("*")
      .eq("area", area)
      .eq("active", true)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return data ?? [];
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
