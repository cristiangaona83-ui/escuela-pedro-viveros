import { createClient } from "@/lib/supabase/server";
import { downloadAsDataUri } from "@/lib/supabase/storage-server";
import type { InstitutionalSignatureRow, StaffMemberRow } from "@/types/database";

export type SignatureAdminRow = InstitutionalSignatureRow & {
  staff_member: Pick<StaffMemberRow, "id" | "full_name"> | null;
  previewDataUri: string | null;
};

/**
 * Todas las firmas (activas e históricas), con una vista previa ya resuelta
 * como Data URI -- el bucket es privado, así que la única forma de
 * mostrarlas en el panel es descargarlas server-side, igual que al generar
 * un PDF (ver `@/lib/pdf/institutional-signatures`).
 */
export async function listSignatures(): Promise<SignatureAdminRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("institutional_signatures")
    .select("*, staff_member:staff_members(id, full_name)")
    .order("kind", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (data as unknown as (InstitutionalSignatureRow & { staff_member: Pick<StaffMemberRow, "id" | "full_name"> | null })[]) ?? [];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      previewDataUri: await downloadAsDataUri(supabase, row.bucket, row.storage_path),
    }))
  );
}
