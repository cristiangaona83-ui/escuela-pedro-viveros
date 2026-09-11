"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";

export function TestimonialForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/testimonios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: String(data.get("full_name") || ""),
          relationship: String(data.get("relationship") || ""),
          message: String(data.get("message") || ""),
          consent: data.get("consent") === "on",
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
        <p className="text-sm">
          ¡Gracias por tu comentario! Quedó registrado y se publicará en el sitio una vez que el establecimiento lo revise.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — invisible para personas. */}
      <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Déjalo en blanco</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FormField label="Nombre completo" htmlFor="full_name" required>
        <Input id="full_name" name="full_name" required autoComplete="name" maxLength={200} />
      </FormField>
      <FormField label="¿Cuál es tu relación con la escuela?" htmlFor="relationship" hint="Opcional -- ej: Apoderada de 4° Básico">
        <Input id="relationship" name="relationship" maxLength={200} />
      </FormField>
      <FormField label="Tu comentario" htmlFor="message" required hint="Cuéntanos tu experiencia o la de tu hijo/a en el establecimiento.">
        <Textarea id="message" name="message" required rows={5} maxLength={3000} />
      </FormField>

      <label className="flex items-start gap-2.5 text-sm text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300" />
        Autorizo que este comentario, si es aprobado por el establecimiento, se publique en el sitio web de la escuela.
      </label>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No pudimos enviar tu comentario. Intenta nuevamente.
        </div>
      )}

      <Button type="submit" disabled={status === "sending"}>
        <Send className="h-4 w-4" />
        {status === "sending" ? "Enviando…" : "Enviar comentario"}
      </Button>
    </form>
  );
}
