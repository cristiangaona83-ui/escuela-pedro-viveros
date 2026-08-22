"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    });

    if (signInError) {
      setError("Correo o contraseña incorrectos. Verifica tus datos e inténtalo nuevamente.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next") || "/plataforma/dashboard";
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Correo electrónico" htmlFor="email" required>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" required>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        <LogIn className="h-4 w-4" />
        {loading ? "Ingresando…" : "Ingresar"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        <Link href="/plataforma/recuperar" className="font-medium text-brand-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
