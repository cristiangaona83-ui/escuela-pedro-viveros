import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, type GradingConfig } from "@/config/grading";
import { SITE } from "@/config/site";

/**
 * Valores por defecto = los ya hardcodeados en `SITE` -- si `school_config`
 * no tiene la key `institutional_profile` (o falla la consulta), el sitio y
 * los PDF siguen funcionando exactamente igual que hoy. `recofiNumber` y
 * `recofiDate` se separan de `SITE.officialRecognition.recofi` (que hoy es
 * un solo string "N° 1594, de fecha 31 de marzo de 1982") solo para que el
 * formulario de administración tenga dos campos editables; el resto del
 * código sigue leyendo `officialRecognition.recofi` como un único string,
 * recompuesto acá.
 */
const DEFAULT_INSTITUTIONAL_PROFILE = {
  name: SITE.name,
  rbd: SITE.rbd,
  director: SITE.director,
  directorTitle: "Director",
  phone: SITE.phone,
  email: SITE.email,
  address: { ...SITE.address },
  officialRecognition: {
    region: SITE.officialRecognition.region,
    province: SITE.officialRecognition.province,
    commune: SITE.officialRecognition.commune,
    recofiNumber: "1594",
    recofiDate: "31 de marzo de 1982",
    planDecree: SITE.officialRecognition.planDecree,
    evaluationDecree: SITE.officialRecognition.evaluationDecree,
  },
};

export type InstitutionalProfile = typeof DEFAULT_INSTITUTIONAL_PROFILE & {
  officialRecognition: typeof DEFAULT_INSTITUTIONAL_PROFILE.officialRecognition & { recofi: string };
};

export async function getInstitutionalProfile(): Promise<InstitutionalProfile> {
  let stored: Partial<typeof DEFAULT_INSTITUTIONAL_PROFILE> = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("school_config").select("value").eq("key", "institutional_profile").maybeSingle();
    stored = (data?.value as Partial<typeof DEFAULT_INSTITUTIONAL_PROFILE>) ?? {};
  } catch {
    stored = {};
  }

  const merged = {
    ...DEFAULT_INSTITUTIONAL_PROFILE,
    ...stored,
    address: { ...DEFAULT_INSTITUTIONAL_PROFILE.address, ...stored.address },
    officialRecognition: { ...DEFAULT_INSTITUTIONAL_PROFILE.officialRecognition, ...stored.officialRecognition },
  };

  return {
    ...merged,
    officialRecognition: {
      ...merged.officialRecognition,
      recofi: `N° ${merged.officialRecognition.recofiNumber}, de fecha ${merged.officialRecognition.recofiDate}`,
    },
  };
}

export async function getGradingConfig(): Promise<GradingConfig> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("school_config").select("value").eq("key", "grading_scale").maybeSingle();
    if (!data) return DEFAULT_GRADING_CONFIG;
    return { ...DEFAULT_GRADING_CONFIG, ...(data.value as Partial<GradingConfig>) };
  } catch {
    return DEFAULT_GRADING_CONFIG;
  }
}

export async function getCertificateSignature() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("school_config").select("value").eq("key", "certificate_signature").maybeSingle();
    return (data?.value as { name: string; title: string } | undefined) ?? { name: "", title: "" };
  } catch {
    return { name: "", title: "" };
  }
}
