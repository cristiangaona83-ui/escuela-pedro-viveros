"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("No pudimos actualizar tu contraseña. El enlace puede haber expirado.");
      return;
    }

    router.replace("/plataforma/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Nueva contraseña" htmlFor="password" required hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus />
      </FormField>
      <FormField label="Confirmar contraseña" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        <KeyRound className="h-4 w-4" />
        {loading ? "Actualizando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
