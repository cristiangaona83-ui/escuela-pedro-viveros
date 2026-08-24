"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { BulletinRecipientGroup, BulletinRecipientRow } from "@/types/database";

export function RecipientForm({ recipient }: { recipient?: BulletinRecipientRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(recipient?.is_primary ?? true);
  const [active, setActive] = useState(recipient?.active ?? true);
  const isEdit = Boolean(recipient);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const payload = {
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim().toLowerCase(),
      group_name: (String(form.get("group_name") || "general")) as BulletinRecipientGroup,
      is_primary: isPrimary,
      active,
    };

    const supabase = createClient();
    const { error: dbError } = isEdit
      ? await supabase.from("bulletin_recipients").update(payload).eq("id", recipient!.id)
      : await supabase.from("bulletin_recipients").insert(payload);

    if (dbError) {
      setLoading(false);
      setError(dbError.code === "23505" ? "Ya existe un destinatario con ese correo." : "No pudimos guardar el destinatario.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: isEdit ? "actualizar_destinatario_informativo" : "crear_destinatario_informativo",
      p_module: "informativos",
      p_entity: "bulletin_recipients",
      p_entity_id: recipient?.id,
      p_details: { email: payload.email },
    });

    setLoading(false);
    router.push("/plataforma/informativos/destinatarios");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre completo" htmlFor="full_name" required>
        <Input id="full_name" name="full_name" required defaultValue={recipient?.full_name} />
      </FormField>
      <FormField label="Correo electrónico" htmlFor="email" required>
        <Input id="email" name="email" type="email" required defaultValue={recipient?.email} />
      </FormField>
      <FormField label="Grupo" htmlFor="group_name" required>
        <Select id="group_name" name="group_name" required defaultValue={recipient?.group_name ?? "general"}>
          <option value="general">Destinatarios generales</option>
          <option value="direccion_copia">Dirección / Copia</option>
        </Select>
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Correo principal (se usa para el envío programado)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Activo
      </label>
      <p className="text-xs text-slate-400">
        Si esta persona ya tiene otro correo registrado, deja &quot;Correo principal&quot; desmarcado aquí — el envío solo usa un
        correo por persona.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar destinatario"}
      </Button>
    </form>
  );
}
