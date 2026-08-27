"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { InstitutionalProfile } from "@/services/school-config";

/**
 * Campos de Contacto que aún no vivían en `institutional_profile`: horario
 * de ATENCIÓN (distinto del horario de estudiantes de Inicio), redes
 * sociales y la búsqueda de Google Maps. Sube el objeto `profile` COMPLETO
 * (no solo estos campos) para no pisar lo que guarda
 * InstitutionalProfileForm -- ambos formularios editan la misma fila.
 */
export function ContactExtrasForm({ profile }: { profile: InstitutionalProfile }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const str = (name: string) => String(form.get(name) || "").trim();

    const value = {
      name: profile.name,
      slogan: profile.slogan,
      rbd: profile.rbd,
      director: profile.director,
      directorTitle: profile.directorTitle,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      // officialRecognition.recofi (computado) se recalcula siempre en
      // getInstitutionalProfile() -- guardar el valor obsoleto es inofensivo.
      officialRecognition: profile.officialRecognition,
      schedule: str("schedule"),
      mapsQuery: str("mapsQuery"),
      socials: {
        facebook: str("facebook") || null,
        instagram: str("instagram") || null,
        youtube: str("youtube") || null,
      },
    };

    const supabase = createClient();
    const { error: dbError } = await supabase.from("school_config").upsert({ key: "institutional_profile", value, is_public: true }, { onConflict: "key" });

    if (!dbError) {
      await supabase.rpc("log_audit", { p_action: "actualizar_datos_institucionales", p_module: "configuracion", p_entity: "school_config", p_entity_id: "institutional_profile" });
    }

    setLoading(false);
    if (dbError) { setError("No pudimos guardar los datos."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Horario de atención" htmlFor="schedule" hint='Se muestra en Contacto. Ej: "Lunes a viernes, 08:00 a 16:00 hrs."'>
        <Input id="schedule" name="schedule" defaultValue={profile.schedule} />
      </FormField>
      <FormField label="Búsqueda en Google Maps" htmlFor="mapsQuery" hint="Dirección o texto usado para el mapa y el botón «Cómo llegar»">
        <Input id="mapsQuery" name="mapsQuery" defaultValue={profile.mapsQuery} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Facebook" htmlFor="facebook" hint="Opcional">
          <Input id="facebook" name="facebook" type="url" defaultValue={profile.socials.facebook ?? ""} />
        </FormField>
        <FormField label="Instagram" htmlFor="instagram" hint="Opcional">
          <Input id="instagram" name="instagram" type="url" defaultValue={profile.socials.instagram ?? ""} />
        </FormField>
        <FormField label="YouTube" htmlFor="youtube" hint="Opcional">
          <Input id="youtube" name="youtube" type="url" defaultValue={profile.socials.youtube ?? ""} />
        </FormField>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> Guardado.</div>}
      <Button type="submit" size="sm" disabled={loading}><Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
