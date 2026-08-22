"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function RecoverForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/plataforma/restablecer-clave`,
    });
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
