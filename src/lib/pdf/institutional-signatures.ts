import { createClient } from "@/lib/supabase/server";
import { downloadAsDataUri } from "@/lib/supabase/storage-server";
import type { InstitutionalSignatureKind } from "@/types/database";

/**
 * Resuelve la firma institucional ACTIVA (tabla `institutional_signatures`,
 * ver supabase/migrations/0033_institutional_signatures.sql) y la entrega
 * como Data URI lista para incrustar en un PDF con `@react-pdf/renderer`.
 *
 * Usa el cliente ligado a la SESIÓN (`@/lib/supabase/server`), no
 * service_role: la ruta que llama a esta función ya exigió sesión y rol
 * autorizado antes de llegar aquí, y las políticas RLS de la migración
 * 0033 permiten a esos mismos roles leer la fila activa y descargar el
 * archivo del bucket privado `archivos-internos`. El binario nunca se
 * sirve como URL pública ni firmada -- solo salen del servidor los bytes
 * del PDF ya renderizado, con la firma incrustada como imagen embebida.
 *
 * `staffMemberId` se pasa solo para `kind: "teacher"` (firma de un/a
 * profesor/a jefe puntual); la firma del Director es única y no lleva
 * `staff_member_id`.
 *
 * Si no hay firma activa, la tabla/bucket no están disponibles, o el
 * archivo no se puede descargar, devuelve `null`: los certificados deben
 * poder emitirse igual (sin la imagen de firma) aunque este paso falle.
 */
export async function getActiveSignatureDataUri(
  kind: InstitutionalSignatureKind,
  staffMemberId?: string
): Promise<string | null> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("institutional_signatures")
      .select("bucket, storage_path")
      .eq("kind", kind)
      .eq("active", true);
    query = staffMemberId ? query.eq("staff_member_id", staffMemberId) : query.is("staff_member_id", null);

    const { data: row, error: rowError } = await query.maybeSingle();
    if (rowError || !row) return null;

    return await downloadAsDataUri(supabase, row.bucket, row.storage_path);
  } catch (err) {
    console.error("[institutional-signatures] Error inesperado obteniendo la firma activa", { kind, err });
    return null;
  }
}

/** Atajo para el caso más usado hoy: la firma (única) del Director. */
export async function getDirectorSignatureDataUri(): Promise<string | null> {
  return getActiveSignatureDataUri("director");
}
