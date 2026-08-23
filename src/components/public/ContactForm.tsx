"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: String(data.get("full_name") || ""),
          email: String(data.get("email") || ""),
          phone: String(data.get("phone") || ""),
          subject: String(data.get("subject") || ""),
          message: String(data.get("message") || ""),
          consent: data.get("consent") === "on",
          // Honeypot: siempre vacío para una persona real.
          website: String(data.get("website") || ""),
        }),
      });
      if (!res.ok) throw new Error("send_failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <p className="text-sm">Tu consulta fue enviada correctamente. Nos pondremos en contacto contigo a la brevedad.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — invisible para personas, no usar autoComplete ni tabIndex normal. */}
      <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Déjalo en blanco</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre completo" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" required autoComplete="name" maxLength={200} />
        </FormField>
        <FormField label="Correo electrónico" htmlFor="email" required>
          <Input id="email" name="email" type="email" required autoComplete="email" maxLength={200} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Teléfono" htmlFor="phone" hint="Opcional">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={50} />
        </FormField>
        <FormField label="Asunto" htmlFor="subject" required>
          <Input id="subject" name="subject" required maxLength={200} />
        </FormField>
      </div>
      <FormField label="Mensaje / Consulta" htmlFor="message" required>
        <Textarea id="message" name="message" required rows={5} maxLength={5000} />
      </FormField>

      <label className="flex items-start gap-2.5 text-sm text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300" />
        Confirmo que los datos ingresados son correctos y autorizo su uso únicamente para responder esta consulta.
      </label>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No pudimos enviar tu consulta. Intenta nuevamente o escríbenos a epviveros@gmail.com.
        </div>
      )}

      <Button type="submit" disabled={status === "sending"}>
        <Send className="h-4 w-4" />
        {status === "sending" ? "Enviando…" : "Enviar consulta"}
      </Button>
    </form>
  );
}
