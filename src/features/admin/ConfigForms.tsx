"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { GradingConfig } from "@/config/grading";
import type { InstitutionalProfile } from "@/services/school-config";

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

export function InstitutionalProfileForm({ profile }: { profile: InstitutionalProfile }) {
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
    const str = (name: string) => String(form.get(name) || "").trim();

    const value = {
      name: str("name"),
      rbd: str("rbd"),
      director: str("director"),
      directorTitle: str("directorTitle"),
      phone: str("phone"),
      email: str("email"),
      address: {
        street: str("street"),
        neighborhood: str("neighborhood"),
        city: str("city"),
        region: str("region"),
        country: profile.address.country,
        full: [str("street"), str("neighborhood"), str("city"), str("region"), profile.address.country].filter(Boolean).join(", "),
      },
      officialRecognition: {
        region: str("orRegion"),
        province: str("orProvince"),
        commune: str("orCommune"),
        recofiNumber: str("recofiNumber"),
        recofiDate: str("recofiDate"),
        planDecree: str("planDecree"),
        evaluationDecree: str("evaluationDecree"),
      },
    };

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("school_config")
      .upsert({ key: "institutional_profile", value, is_public: false }, { onConflict: "key" });

    if (!dbError) {
      await supabase.rpc("log_audit", { p_action: "actualizar_datos_institucionales", p_module: "configuracion", p_entity: "school_config", p_entity_id: "institutional_profile" });
    }

    setLoading(false);
    if (dbError) { setError("No pudimos guardar los datos institucionales."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre del establecimiento" htmlFor="name" required>
          <Input id="name" name="name" defaultValue={profile.name} required />
        </FormField>
        <FormField label="RBD" htmlFor="rbd" required>
          <Input id="rbd" name="rbd" defaultValue={profile.rbd} required />
        </FormField>
        <FormField label="Nombre del Director" htmlFor="director" required>
          <Input id="director" name="director" defaultValue={profile.director} required />
        </FormField>
        <FormField label="Cargo" htmlFor="directorTitle" required>
          <Input id="directorTitle" name="directorTitle" defaultValue={profile.directorTitle} required />
        </FormField>
        <FormField label="Teléfono" htmlFor="phone" required>
          <Input id="phone" name="phone" defaultValue={profile.phone} required />
        </FormField>
        <FormField label="Correo institucional" htmlFor="email" required>
          <Input id="email" name="email" type="email" defaultValue={profile.email} required />
        </FormField>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800">Dirección</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField label="Calle y número" htmlFor="street" required>
            <Input id="street" name="street" defaultValue={profile.address.street} required />
          </FormField>
          <FormField label="Sector / villa" htmlFor="neighborhood" hint="Opcional">
            <Input id="neighborhood" name="neighborhood" defaultValue={profile.address.neighborhood} />
          </FormField>
          <FormField label="Comuna y ciudad" htmlFor="city" required>
            <Input id="city" name="city" defaultValue={profile.address.city} required />
          </FormField>
          <FormField label="Región (texto largo)" htmlFor="region" required hint="Ej: Región de Valparaíso">
            <Input id="region" name="region" defaultValue={profile.address.region} required />
          </FormField>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800">Reconocimiento oficial</h3>
        <p className="mt-1 text-xs text-slate-500">Aparece en los certificados y en la ficha PDF de matrícula.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField label="Región" htmlFor="orRegion" required>
            <Input id="orRegion" name="orRegion" defaultValue={profile.officialRecognition.region} required />
          </FormField>
          <FormField label="Provincia" htmlFor="orProvince" required>
            <Input id="orProvince" name="orProvince" defaultValue={profile.officialRecognition.province} required />
          </FormField>
          <FormField label="Comuna" htmlFor="orCommune" required>
            <Input id="orCommune" name="orCommune" defaultValue={profile.officialRecognition.commune} required />
          </FormField>
          <FormField label="N° de Resolución RECOFI" htmlFor="recofiNumber" required hint="Solo el número, ej: 1594">
            <Input id="recofiNumber" name="recofiNumber" defaultValue={profile.officialRecognition.recofiNumber} required />
          </FormField>
          <FormField label="Fecha de la resolución" htmlFor="recofiDate" required hint="Ej: 31 de marzo de 1982">
            <Input id="recofiDate" name="recofiDate" defaultValue={profile.officialRecognition.recofiDate} required />
          </FormField>
          <FormField label="Decreto Plan y Programas de Estudio" htmlFor="planDecree" required>
            <Input id="planDecree" name="planDecree" defaultValue={profile.officialRecognition.planDecree} required />
          </FormField>
          <FormField label="Decreto de Evaluación y Promoción" htmlFor="evaluationDecree" required>
            <Input id="evaluationDecree" name="evaluationDecree" defaultValue={profile.officialRecognition.evaluationDecree} required />
          </FormField>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Datos institucionales guardados.</div>}

      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> Guardar datos institucionales</Button>
    </form>
  );
}
