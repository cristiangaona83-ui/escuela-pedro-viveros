"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, FileValidationError } from "@/lib/supabase/storage";
import type { InstitutionalSignatureKind, StaffMemberRow } from "@/types/database";

/**
 * Subir una firma nueva SIEMPRE crea una fila nueva (no reemplaza el
 * archivo anterior en Storage) -- así queda como historial. La fila
 * anterior activa del mismo kind/staff_member_id se desactiva antes de
 * insertar la nueva, para respetar el índice único parcial de
 * institutional_signatures (a lo sumo una activa por kind/persona).
 */
export function SignatureUploadForm({ teachers }: { teachers: StaffMemberRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [kind, setKind] = useState<InstitutionalSignatureKind>("director");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;
    const displayName = String(form.get("display_name") || "").trim();
    const title = String(form.get("title") || "").trim();
    const notes = String(form.get("notes") || "").trim() || null;
    const staffMemberId = kind === "teacher" ? String(form.get("staff_member_id") || "") || null : null;

    if (!file || file.size === 0) { setLoading(false); setError("Selecciona una imagen de la firma."); return; }
    if (kind === "teacher" && !staffMemberId) { setLoading(false); setError("Selecciona a qué docente pertenece esta firma."); return; }

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    const folder = kind === "director" ? "firmas/director" : kind === "teacher" ? `firmas/docentes/${staffMemberId}` : "firmas/otros";

    let storagePath: string;
    try {
      storagePath = await uploadPrivateFile(folder, file, "signature");
    } catch (uploadError) {
      setLoading(false);
      setError(uploadError instanceof FileValidationError ? uploadError.message : "No pudimos subir la imagen.");
      return;
    }

    // Desactiva la firma activa anterior del mismo kind/persona (si existe) antes de insertar la nueva.
    let deactivateQuery = supabase.from("institutional_signatures").update({ active: false, updated_by: authData.user?.id }).eq("kind", kind).eq("active", true);
    deactivateQuery = staffMemberId ? deactivateQuery.eq("staff_member_id", staffMemberId) : deactivateQuery.is("staff_member_id", null);
    const { error: deactivateError } = await deactivateQuery;
    if (deactivateError) {
      setLoading(false);
      setError("No pudimos desactivar la firma anterior. Intenta de nuevo antes de subir una nueva.");
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("institutional_signatures")
      .insert({
        kind,
        staff_member_id: staffMemberId,
        display_name: displayName,
        title,
        storage_path: storagePath,
        notes,
        active: true,
        created_by: authData.user?.id,
        updated_by: authData.user?.id,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setLoading(false);
      setError("La imagen se subió, pero no pudimos registrar la firma. Contacta a soporte antes de reintentar para no dejar archivos huérfanos.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "subir_firma",
      p_module: "firmas",
      p_entity: "institutional_signatures",
      p_entity_id: inserted.id,
      p_details: { kind, display_name: displayName, storage_path: storagePath },
    });

    setLoading(false);
    setSaved(true);
    event.currentTarget.reset();
    setKind("director");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tipo de firma" htmlFor="kind" required>
        <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as InstitutionalSignatureKind)}>
          <option value="director">Director</option>
          <option value="teacher">Profesor(a) Jefe</option>
          <option value="other">Otra</option>
        </Select>
      </FormField>

      {kind === "teacher" && (
        <FormField label="Docente" htmlFor="staff_member_id" required>
          <Select id="staff_member_id" name="staff_member_id" defaultValue="" required>
            <option value="" disabled>Selecciona una persona…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
        </FormField>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" htmlFor="display_name" required>
          <Input id="display_name" name="display_name" required />
        </FormField>
        <FormField label="Cargo" htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Director" />
        </FormField>
      </div>

      <FormField label="Imagen de la firma" htmlFor="file" required hint="PNG o WEBP con fondo transparente. Máximo 2 MB.">
        <Input id="file" name="file" type="file" accept="image/png,image/webp" required />
      </FormField>

      <FormField label="Notas" htmlFor="notes" hint="Opcional — visible solo en el panel de administración.">
        <Textarea id="notes" name="notes" rows={2} />
      </FormField>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Firma subida y activada.</div>}

      <Button type="submit" size="sm" disabled={loading}>
        <UploadCloud className="h-4 w-4" /> {loading ? "Subiendo…" : "Subir y activar"}
      </Button>
    </form>
  );
}
