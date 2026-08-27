import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, type GradingConfig } from "@/config/grading";
import { SITE } from "@/config/site";
import { HISTORY, MISSION, VISION, PEI_INTRO } from "@/config/institutional-content";

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
  slogan: SITE.slogan,
  rbd: SITE.rbd,
  director: SITE.director,
  directorTitle: "Director",
  phone: SITE.phone,
  email: SITE.email,
  schedule: SITE.schedule ?? "",
  mapsQuery: SITE.mapsQuery,
  socials: { ...SITE.socials },
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
    socials: { ...DEFAULT_INSTITUTIONAL_PROFILE.socials, ...stored.socials },
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

async function getConfigValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("school_config").select("value").eq("key", key).maybeSingle();
    if (!data) return fallback;
    return { ...fallback, ...(data.value as Partial<T>) };
  } catch {
    return fallback;
  }
}

/**
 * Bloque de Admisión de Inicio (SAE + Vacantes) -- campos separados para
 * fecha límite, enlaces, CTA y textos (decisión explícita del usuario), en
 * vez de un párrafo único con la fecha incrustada como antes.
 */
export interface AdmissionBlock {
  badge: string;
  title: string;
  paragraphs: string[];
  deadlineLabel: string;
  ctaBoxTitle: string;
  ctaBoxText: string;
  ctaText: string;
  ctaHref: string;
}

const DEFAULT_HOME_ADMISSION: { sae: AdmissionBlock; vacantes: Omit<AdmissionBlock, "deadlineLabel" | "ctaBoxTitle" | "ctaBoxText"> } = {
  sae: {
    badge: "Admisión 2027",
    title: "¡Postulaciones SAE 2027 abiertas! 🏫✨",
    paragraphs: [
      "Ya se encuentra abierto el Periodo Principal de Postulación del Sistema de Admisión Escolar (SAE) para el año 2027.",
      "Revisa establecimientos, ordena tus preferencias y envía tu postulación dentro del plazo indicado.",
      "Recuerda: el proceso no es por orden de llegada. Puedes realizar tu postulación con calma dentro del plazo establecido; el día y la hora en que la envíes no influyen en el resultado.",
    ],
    deadlineLabel: "Plazo hasta el jueves 27 de agosto a las 14:00 horas",
    ctaBoxTitle: `¿Quieres ser parte de la ${SITE.name} en 2027?`,
    ctaBoxText: "Ingresa al Sistema de Admisión Escolar y realiza tu postulación dentro del plazo.",
    ctaText: "Postular en SAE",
    ctaHref: "https://www.sistemadeadmisionescolar.cl/",
  },
  vacantes: {
    badge: "Vacantes 2026",
    title: "¿Necesitas una vacante para este año?",
    paragraphs: [
      "Si necesitas matrícula durante el año escolar 2026 o no obtuviste un cupo mediante el proceso regular, puedes utilizar Anótate en la Lista, plataforma oficial del Ministerio de Educación para solicitar vacantes disponibles.",
      "Las solicitudes se realizan en línea y las vacantes disponibles se gestionan respetando el orden de llegada registrado en la plataforma.",
    ],
    ctaText: "Anótate en la Lista",
    ctaHref: "https://www.sistemadeadmisionescolar.cl/",
  },
};

export type HomeAdmissionContent = typeof DEFAULT_HOME_ADMISSION;

export async function getHomeAdmissionContent(): Promise<HomeAdmissionContent> {
  const stored = await getConfigValue<Partial<HomeAdmissionContent>>("home_admission", {});
  return {
    sae: { ...DEFAULT_HOME_ADMISSION.sae, ...stored.sae },
    vacantes: { ...DEFAULT_HOME_ADMISSION.vacantes, ...stored.vacantes },
  };
}

export interface ScheduleBlock {
  label: string;
  entrada: string;
  salida: string;
}

const DEFAULT_HOME_SCHEDULE: { blocks: ScheduleBlock[] } = {
  blocks: [
    { label: "Lunes a jueves", entrada: "08:15 hrs.", salida: "15:30 hrs." },
    { label: "Viernes", entrada: "08:15 hrs.", salida: "13:15 hrs." },
  ],
};

export async function getHomeScheduleContent(): Promise<{ blocks: ScheduleBlock[] }> {
  return getConfigValue("home_schedule", DEFAULT_HOME_SCHEDULE);
}

const DEFAULT_NUESTRA_ESCUELA_CONTENT = {
  historyParagraphs: HISTORY.paragraphs,
  mission: MISSION ?? "",
  vision: VISION ?? "",
};

export type NuestraEscuelaContent = typeof DEFAULT_NUESTRA_ESCUELA_CONTENT;

export async function getNuestraEscuelaContent(): Promise<NuestraEscuelaContent> {
  return getConfigValue("nuestra_escuela_content", DEFAULT_NUESTRA_ESCUELA_CONTENT);
}

const DEFAULT_PROYECTO_EDUCATIVO_CONTENT = {
  introParagraphs: PEI_INTRO.paragraphs,
};

export type ProyectoEducativoContent = typeof DEFAULT_PROYECTO_EDUCATIVO_CONTENT;

export async function getProyectoEducativoContent(): Promise<ProyectoEducativoContent> {
  return getConfigValue("proyecto_educativo_content", DEFAULT_PROYECTO_EDUCATIVO_CONTENT);
}
