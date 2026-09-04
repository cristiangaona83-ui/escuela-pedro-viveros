"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { GuardianContactListItem } from "@/services/seguro-escolar";

/** Comunicación con apoderado -- gestión interna de seguimiento, nunca
 * forma parte del formulario oficial 0374-3. */
export function GuardianContactsPanel({
  declarationId,
  canManage,
  contacts,
  suggestedName,
}: {
  declarationId: string;
  canManage: boolean;
  contacts: GuardianContactListItem[];
  suggestedName: string | null;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contactName = String(form.get("contact_name") || "").trim();
    const contactDate = String(form.get("contact_date") || "");
    const contactMethod = String(form.get("contact_method") || "").trim();
    if (!contactName || !contactDate || !contactMethod) {
      setError("Completa nombre, fecha y medio de contacto.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("seguro_escolar_guardian_contacts")
      .insert({
        declaration_id: declarationId,
        contact_name: contactName,
        contact_date: contactDate,
        contact_time: String(form.get("contact_time") || "") || null,
        contact_method: contactMethod,
        staff_member_id: user.id,
        result: String(form.get("result") || "").trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setLoading(false);
      setError(insertError?.message || "No pudimos registrar el contacto.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "registrar_contacto_apoderado_seguro_escolar",
      p_module: "seguro_escolar",
      p_entity: "seguro_escolar_guardian_contacts",
      p_entity_id: inserted.id,
      p_details: { declaration_id: declarationId },
    });

    setLoading(false);
    setFormOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && !formOpen && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar contacto con apoderado
          </Button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Nombre del apoderado" htmlFor="contact_name" required>
              <Input id="contact_name" name="contact_name" required defaultValue={suggestedName ?? ""} />
            </FormField>
            <FormField label="Fecha" htmlFor="contact_date" required>
              <Input id="contact_date" name="contact_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
            <FormField label="Hora" htmlFor="contact_time">
              <Input id="contact_time" name="contact_time" type="time" />
            </FormField>
          </div>
          <FormField label="Medio" htmlFor="contact_method" required hint="Ej: teléfono, WhatsApp, presencial…">
            <Input id="contact_method" name="contact_method" required />
          </FormField>
          <FormField label="Resultado" htmlFor="result" hint="Opcional">
            <Textarea id="result" name="result" rows={2} />
          </FormField>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      )}

      {contacts.length > 0 ? (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{c.contact_name}</span>
                <span className="text-xs text-slate-400">
                  {formatDate(c.contact_date)} {c.contact_time ? `· ${c.contact_time.slice(0, 5)}` : ""} · {c.contact_method}
                </span>
              </div>
              {c.result && <p className="mt-1 text-sm text-slate-600">{c.result}</p>}
              {c.staffName && <p className="mt-1 text-xs text-slate-400">Contactado por {c.staffName}</p>}
            </li>
          ))}
        </ul>
      ) : (
        !formOpen && <EmptyState icon={Phone} title="Sin contactos registrados" />
      )}
    </div>
  );
}
