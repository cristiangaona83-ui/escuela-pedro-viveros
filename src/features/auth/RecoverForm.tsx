"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

function friendlyErrorMessage(code: string | undefined, message: string) {
  if (code === "over_email_send_rate_limit") {
    return "Se enviaron demasiados correos en poco tiempo. Espera unos minutos antes de solicitar otro enlace.";
  }
  return message || "No pudimos enviar el enlace de recuperación. Inténtalo nuevamente en unos minutos.";
}

export function RecoverForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const supabase = createClient();

    // El proyecto usa flujo PKCE (@supabase/ssr): el enlace del correo vuelve
    // con "?code=" al callback, que lo intercambia por una sesión real antes
    // de llegar al formulario de nueva contraseña.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/plataforma/auth/callback?next=/plataforma/restablecer-clave`,
    });

    if (resetError) {
      setError(friendlyErrorMessage(resetError.code, resetError.message));
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Correo electrónico" htmlFor="email" required>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={status === "sending"}>
        <Mail className="h-4 w-4" />
        {status === "sending" ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        <Link href="/plataforma/login" className="font-medium text-brand-700 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
