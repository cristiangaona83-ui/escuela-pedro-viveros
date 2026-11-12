"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { emptyMatriculaForm, type MatriculaFormData } from "@/lib/matricula";
import { MatriculaForm } from "@/features/matricula/MatriculaForm";

/** Formulario público de pre-matrícula (el mismo de Inspectoría, en su versión para familias). */
export function PrematriculaPublicForm({ token, yearLabel, levels }: { token: string; yearLabel: string; levels: string[] }) {
  const [code, setCode] = useState<string | null>(null);
  const [level, setLevel] = useState("");

  async function handleSubmit(data: MatriculaFormData, _courseId: string, honeypot: string): Promise<string | null> {
    void _courseId;
    try {
      const res = await fetch("/api/pre-matricula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, website: honeypot, data }),
      });
      const json = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      if (!res.ok) return json.error ?? "No pudimos enviar la pre-matrícula. Inténtalo de nuevo.";
      setLevel(data.level_requested);
      setCode(json.code ?? "");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return null;
    } catch {
      return "No pudimos enviar la pre-matrícula. Revisa tu conexión e inténtalo de nuevo.";
    }
  }

  if (code !== null) {
    return (
      <Card>
        <CardBody className="space-y-3 py-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="font-heading text-xl font-medium text-slate-900">¡Pre-matrícula enviada!</h2>
          <p className="mx-auto max-w-md text-sm text-slate-600">
            Recibimos la ficha para <strong>{level}</strong>. El establecimiento revisará los datos y se comunicará con ustedes para confirmar la matrícula {yearLabel}.
          </p>
          {code && code !== "00000000" && <p className="text-xs text-slate-500">Código de referencia: <strong>{code}</strong></p>}
          <p className="text-xs text-slate-500">Esta pre-matrícula no confirma cupo ni formaliza por sí sola la matrícula.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <MatriculaForm mode="public" yearLabel={yearLabel} levels={levels} initial={emptyMatriculaForm()} submitLabel="Enviar pre-matrícula" onSubmit={handleSubmit} />
      </CardBody>
    </Card>
  );
}
