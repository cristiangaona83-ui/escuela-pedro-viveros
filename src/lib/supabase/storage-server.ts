import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Descarga un objeto de Supabase Storage con un cliente ya autenticado
 * (de sesión o service_role, según lo decida el llamador) y lo entrega como
 * Data URI. Compartido entre la resolución de la firma activa para PDFs
 * (`@/lib/pdf/institutional-signatures`) y la vista previa en el panel de
 * administración de firmas -- para no duplicar la lógica de descarga.
 * Devuelve `null` en vez de lanzar si el objeto no existe o falla la
 * descarga; el llamador decide cómo degradar (línea en blanco, sin vista
 * previa, etc.).
 */
export async function downloadAsDataUri(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;

    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length === 0) return null;

    const contentType = data.type && data.type.startsWith("image/") ? data.type : "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
