"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("contact_messages").insert({
        full_name: String(form.get("full_name") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || "") || null,
        subject: String(form.get("subject") || "") || null,
        message: String(form.get("message") || ""),
      });
      if (error) throw error;
      setStatus("success");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <p className="text-sm">Tu mensaje fue enviado. Nos pondremos en contacto a la brevedad.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre completo" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" required autoComplete="name" />
        </FormField>
        <FormField label="Correo electrónico" htmlFor="email" required>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Teléfono" htmlFor="phone" hint="Opcional">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </FormField>
        <FormField label="Asunto" htmlFor="subject" hint="Opcional">
          <Input id="subject" name="subject" />
        </FormField>
      </div>
      <FormField label="Mensaje" htmlFor="message" required>
        <Textarea id="message" name="message" required rows={5} />
      </FormField>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No pudimos enviar tu mensaje. Inténtalo nuevamente en unos minutos.
        </div>
      )}

      <Button type="submit" disabled={status === "sending"}>
        <Send className="h-4 w-4" />
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
