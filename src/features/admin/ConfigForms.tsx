"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { GradingConfig } from "@/config/grading";

export function GradingScaleForm({ config }: { config: GradingConfig }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const value: GradingConfig = {
      scaleMin: Number(form.get("scaleMin")),
      scaleMax: Number(form.get("scaleMax")),
      approvalMinimum: Number(form.get("approvalMinimum")),
      decimalPlaces: Number(form.get("decimalPlaces")),
      roundingRule: String(form.get("roundingRule")) as GradingConfig["roundingRule"],
    };

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("school_config")
      .upsert({ key: "grading_scale", value, is_public: false }, { onConflict: "key" });

    setLoading(false);
    if (dbError) { setError("No pudimos guardar la configuración."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nota mínima" htmlFor="scaleMin" required>
          <Input id="scaleMin" name="scaleMin" type="number" step="0.1" defaultValue={config.scaleMin} required />
        </FormField>
        <FormField label="Nota máxima" htmlFor="scaleMax" required>
          <Input id="scaleMax" name="scaleMax" type="number" step="0.1" defaultValue={config.scaleMax} required />
        </FormField>
        <FormField label="Nota mínima de aprobación" htmlFor="approvalMinimum" required>
          <Input id="approvalMinimum" name="approvalMinimum" type="number" step="0.1" defaultValue={config.approvalMinimum} required />
        </FormField>
        <FormField label="Decimales" htmlFor="decimalPlaces" required>
          <Input id="decimalPlaces" name="decimalPlaces" type="number" min={0} max={2} defaultValue={config.decimalPlaces} required />
        </FormField>
      </div>
      <FormField label="Regla de redondeo" htmlFor="roundingRule" required>
        <Select id="roundingRule" name="roundingRule" defaultValue={config.roundingRule}>
          <option value="half_up">Hacia arriba desde 0,5 (half up)</option>
          <option value="half_down">Hacia abajo desde 0,5 (half down)</option>
          <option value="none">Sin redondeo</option>
        </Select>
      </FormField>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Configuración guardada.</div>}

      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> Guardar escala</Button>
    </form>
  );
}

export function SignatureForm({ name, title }: { name: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const value = { name: String(form.get("name") || ""), title: String(form.get("title") || "") };

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("school_config")
      .upsert({ key: "certificate_signature", value, is_public: false }, { onConflict: "key" });

    setLoading(false);
    if (dbError) { setError("No pudimos guardar la firma."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" defaultValue={name} required />
      </FormField>
      <FormField label="Cargo" htmlFor="title" required>
        <Input id="title" name="title" defaultValue={title} required />
      </FormField>
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Firma actualizada.</div>}
      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> Guardar firma</Button>
    </form>
  );
}
