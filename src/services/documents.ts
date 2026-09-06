import { createClient } from "@/lib/supabase/server";
import { CIRCULARES_CATEGORY } from "@/features/documents/circulares/constants";
import type { DocumentRow, DocumentStatus } from "@/types/database";

export async function listDocuments(category?: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  let query = supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return data ?? [];
}

export async function listDocumentCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("category");
  const unique = Array.from(new Set((data ?? []).map((d) => d.category))).sort();
  return unique;
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  return data;
}

// ---------------------------------------------------------------------------
// Circulares Informativas -- categoría propia dentro de la misma tabla
// `documents` (category = CIRCULARES_CATEGORY), sin infraestructura nueva.
// ---------------------------------------------------------------------------
export interface CircularListItem extends DocumentRow {
  uploaderName: string | null;
}

export interface CircularFilters {
  year?: number;
  status?: DocumentStatus;
  search?: string;
}

export async function listCircularesInformativas(filters: CircularFilters = {}): Promise<CircularListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("*, profiles!documents_uploaded_by_fkey(full_name)")
    .eq("category", CIRCULARES_CATEGORY)
    .order("document_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.year) query = query.eq("year", filters.year);
  if (filters.status) query = query.eq("status", filters.status);

  const { data } = await query;
  type Row = DocumentRow & { profiles: { full_name: string } | null };
  let items = ((data ?? []) as unknown as Row[]).map((r) => {
    const { profiles, ...rest } = r;
    return { ...rest, uploaderName: profiles?.full_name ?? null };
  });

  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.document_number ?? "").toLowerCase().includes(q)
    );
  }

  return items;
}

/** Años con al menos una circular registrada, más el año actual si todavía no tiene ninguna
 * (siempre debe poder crearse una circular del año en curso). El año actual va primero, el resto descendente. */
export async function listCircularesYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("year").eq("category", CIRCULARES_CATEGORY).not("year", "is", null);
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear, ...(data ?? []).map((d) => d.year as number)]);
  return Array.from(years).sort((a, b) => (a === currentYear ? -1 : b === currentYear ? 1 : b - a));
}

export async function countCircularesInformativas(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("category", CIRCULARES_CATEGORY);
  return count ?? 0;
}

export async function getCircularInformativa(id: string): Promise<CircularListItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*, profiles!documents_uploaded_by_fkey(full_name)")
    .eq("id", id)
    .eq("category", CIRCULARES_CATEGORY)
    .maybeSingle();
  if (!data) return null;
  type Row = DocumentRow & { profiles: { full_name: string } | null };
  const { profiles, ...rest } = data as unknown as Row;
  return { ...rest, uploaderName: profiles?.full_name ?? null };
}
