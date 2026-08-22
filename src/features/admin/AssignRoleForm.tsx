"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserCog, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow, RoleRow } from "@/types/database";

export function AssignRoleForm({ profiles, roles }: { profiles: ProfileRow[]; roles: RoleRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("user_roles").insert({
      user_id: String(form.get("user_id") || ""),
      role_id: String(form.get("role_id") || ""),
    });
    setLoading(false);
    if (dbError) {
      setError(dbError.code === "23505" ? "Ese usuario ya tiene ese rol asignado." : "No pudimos asignar el rol.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Usuario" htmlFor="user_id" required hint="El usuario debe existir previamente en Supabase Auth.">
        <Select id="user_id" name="user_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Rol" htmlFor="role_id" required>
        <Select id="role_id" name="role_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>
      </FormField>
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <Button type="submit" size="sm" disabled={loading}><UserCog className="h-4 w-4" /> Asignar rol</Button>
    </form>
  );
}
