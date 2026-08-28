"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Settings2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceThresholds } from "@/lib/attendance/calc";

/**
 * Umbrales del semáforo -- configuración administrativa, no una clasificación
 * legal automática. Solo director/superadmin pueden escribir school_config
 * (RLS: config_write_admin), coherente con quién ve este formulario.
 */
export function ThresholdConfigForm({ thresholds }: { thresholds: AttendanceThresholds }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const green = Number(form.get("green"));
    const yellow = Number(form.get("yellow"));

    if (!Number.isFinite(green) || !Number.isFinite(yellow) || green <= yellow || green > 100 || yellow < 0) {
      setError("El umbral verde debe ser mayor al amarillo, y ambos entre 0 y 100.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: upsertError } = await supabase
      .from("school_config")
      .upsert({ key: "attendance_thresholds", value: { green, yellow }, is_public: false, updated_by: user?.id ?? null }, { onConflict: "key" });

    if (upsertError) {
      setLoading(false);
      setError("No pudimos guardar la configuración.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "actualizar_umbrales_asistencia",
      p_module: "reportes",
      p_entity: "school_config",
      p_details: { green, yellow },
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline">
        <Settings2 className="h-3.5 w-3.5" /> Configurar umbrales del semáforo
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-3">
      <FormField label="Verde desde (%)" htmlFor="green" hint="Asistencia adecuada">
        <Input id="green" name="green" type="number" min={0} max={100} step={0.1} defaultValue={thresholds.green} className="w-28" required />
      </FormField>
      <FormField label="Amarillo desde (%)" htmlFor="yellow" hint="Bajo esto es rojo">
        <Input id="yellow" name="yellow" type="number" min={0} max={100} step={0.1} defaultValue={thresholds.yellow} className="w-28" required />
      </FormField>
      <Button type="submit" size="sm" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}
    </form>
  );
}
