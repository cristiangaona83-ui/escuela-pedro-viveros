import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, type GradingConfig } from "@/config/grading";
import { SITE } from "@/config/site";
import { HISTORY, MISSION, VISION, PEI_INTRO } from "@/config/institutional-content";
import { normalizeAlign, normalizeParagraphs, type Align, type AlignedText } from "@/lib/content-align";

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

export interface InstitutionalStampConfig {
  storagePath: string | null;
  bucket: string;
  uploadedAt: string | null;
}

/**
 * Timbre institucional -- a diferencia de las firmas (institutional_signatures,
 * una fila por persona/cargo), es uno solo para toda la escuela, así que se
 * guarda como una fila más de `school_config` (mismo patrón que
 * certificate_signature/institutional_profile) en vez de agregar una tabla o
 * columna nueva. El archivo en sí vive en el mismo bucket privado y la misma
 * carpeta `firmas/` que ya usan las firmas -- reutiliza sus políticas de
 * Storage tal cual, sin política nueva.
 */
export async function getInstitutionalStampConfig(): Promise<InstitutionalStampConfig> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("school_config").select("value").eq("key", "institutional_stamp").maybeSingle();
    const value = data?.value as { storage_path?: string; bucket?: string; uploaded_at?: string } | undefined;
    return {
      storagePath: value?.storage_path ?? null,
      bucket: value?.bucket ?? "archivos-internos",
      uploadedAt: value?.uploaded_at ?? null,
    };
  } catch {
    return { storagePath: null, bucket: "archivos-internos", uploadedAt: null };
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
 *
 * Alineación: los campos simples (badge/title/etc.) llevan una propiedad
 * hermana `xAlign` en vez de anidarse en `{text, align}` -- así el resto
 * del código que ya lee `.title`/`.badge` como string plano no se rompe.
 * `paragraphs` sí es `{text, align}[]` porque la alineación es realmente
 * por párrafo (un array paralelo de alineaciones se desincroniza al
 * reordenar/agregar/quitar párrafos).
 */
export interface AdmissionBlock {
  badge: string;
  badgeAlign: Align;
  title: string;
  titleAlign: Align;
  paragraphs: AlignedText[];
  deadlineLabel: string;
  deadlineLabelAlign: Align;
  ctaBoxTitle: string;
  ctaBoxTitleAlign: Align;
  ctaBoxText: string;
  ctaBoxTextAlign: Align;
  ctaText: string;
  ctaHref: string;
}

type VacantesBlock = Omit<
  AdmissionBlock,
  "deadlineLabel" | "deadlineLabelAlign" | "ctaBoxTitle" | "ctaBoxTitleAlign" | "ctaBoxText" | "ctaBoxTextAlign"
>;

// Los valores *Align por defecto reproducen la apariencia visual actual del
// sitio (heredada de un wrapper `text-center`, o fija en `text-left`/
// `text-justify` según el bloque) -- ver auditoría: agregar esta función NO
// debe cambiar cómo se ve ningún contenido existente.
const DEFAULT_HOME_ADMISSION: { sae: AdmissionBlock; vacantes: VacantesBlock } = {
  sae: {
    badge: "Admisión 2027",
    badgeAlign: "center",
    title: "¡Postulaciones SAE 2027 abiertas! 🏫✨",
    titleAlign: "center",
    paragraphs: [
      "Ya se encuentra abierto el Periodo Principal de Postulación del Sistema de Admisión Escolar (SAE) para el año 2027.",
      "Revisa establecimientos, ordena tus preferencias y envía tu postulación dentro del plazo indicado.",
      "Recuerda: el proceso no es por orden de llegada. Puedes realizar tu postulación con calma dentro del plazo establecido; el día y la hora en que la envíes no influyen en el resultado.",
    ].map((text) => ({ text, align: "left" as const })),
    deadlineLabel: "Plazo hasta el jueves 27 de agosto a las 14:00 horas",
    deadlineLabelAlign: "center",
    ctaBoxTitle: `¿Quieres ser parte de la ${SITE.name} en 2027?`,
    ctaBoxTitleAlign: "center",
    ctaBoxText: "Ingresa al Sistema de Admisión Escolar y realiza tu postulación dentro del plazo.",
    ctaBoxTextAlign: "center",
    ctaText: "Postular en SAE",
    ctaHref: "https://www.sistemadeadmisionescolar.cl/",
  },
  vacantes: {
    badge: "Vacantes 2026",
    badgeAlign: "center",
    title: "¿Necesitas una vacante para este año?",
    titleAlign: "center",
    paragraphs: [
      "Si necesitas matrícula durante el año escolar 2026 o no obtuviste un cupo mediante el proceso regular, puedes utilizar Anótate en la Lista, plataforma oficial del Ministerio de Educación para solicitar vacantes disponibles.",
      "Las solicitudes se realizan en línea y las vacantes disponibles se gestionan respetando el orden de llegada registrado en la plataforma.",
    ].map((text) => ({ text, align: "justify" as const })),
    ctaText: "Anótate en la Lista",
    ctaHref: "https://www.sistemadeadmisionescolar.cl/",
  },
};

export type HomeAdmissionContent = { sae: AdmissionBlock; vacantes: VacantesBlock };

function mergeAdmissionBlock<T extends VacantesBlock>(defaults: T, stored: Partial<T> | undefined, paragraphLegacyAlign: Align): T {
  const s: Partial<T> = stored ?? {};
  return {
    ...defaults,
    ...s,
    badgeAlign: normalizeAlign((s as Partial<AdmissionBlock>).badgeAlign, defaults.badgeAlign),
    titleAlign: normalizeAlign((s as Partial<AdmissionBlock>).titleAlign, defaults.titleAlign),
    paragraphs: s.paragraphs ? normalizeParagraphs(s.paragraphs, paragraphLegacyAlign) : defaults.paragraphs,
  };
}

export async function getHomeAdmissionContent(): Promise<HomeAdmissionContent> {
  const stored = await getConfigValue<{ sae?: Partial<AdmissionBlock>; vacantes?: Partial<VacantesBlock> }>("home_admission", {});
  const sae = mergeAdmissionBlock(DEFAULT_HOME_ADMISSION.sae, stored.sae, "left");
  return {
    sae: {
      ...sae,
      deadlineLabelAlign: normalizeAlign(stored.sae?.deadlineLabelAlign, DEFAULT_HOME_ADMISSION.sae.deadlineLabelAlign),
      ctaBoxTitleAlign: normalizeAlign(stored.sae?.ctaBoxTitleAlign, DEFAULT_HOME_ADMISSION.sae.ctaBoxTitleAlign),
      ctaBoxTextAlign: normalizeAlign(stored.sae?.ctaBoxTextAlign, DEFAULT_HOME_ADMISSION.sae.ctaBoxTextAlign),
    },
    vacantes: mergeAdmissionBlock(DEFAULT_HOME_ADMISSION.vacantes, stored.vacantes, "justify"),
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

// Alineación por defecto = la apariencia actual del sitio: la historia ya
// se mostraba con `text-justify` por párrafo, misión/visión sin clase (=
// izquierda).
const DEFAULT_NUESTRA_ESCUELA_CONTENT = {
  historyParagraphs: HISTORY.paragraphs.map((text) => ({ text, align: "justify" as const })),
  mission: MISSION ?? "",
  missionAlign: "left" as const,
  vision: VISION ?? "",
  visionAlign: "left" as const,
};

export type NuestraEscuelaContent = {
  historyParagraphs: AlignedText[];
  mission: string;
  missionAlign: Align;
  vision: string;
  visionAlign: Align;
};

export async function getNuestraEscuelaContent(): Promise<NuestraEscuelaContent> {
  const stored = await getConfigValue<Partial<NuestraEscuelaContent>>("nuestra_escuela_content", {});
  return {
    ...DEFAULT_NUESTRA_ESCUELA_CONTENT,
    ...stored,
    historyParagraphs: stored.historyParagraphs
      ? normalizeParagraphs(stored.historyParagraphs, "justify")
      : DEFAULT_NUESTRA_ESCUELA_CONTENT.historyParagraphs,
    missionAlign: normalizeAlign(stored.missionAlign, "left"),
    visionAlign: normalizeAlign(stored.visionAlign, "left"),
  };
}

// La introducción del PEI ya se mostraba con `text-justify` por párrafo.
const DEFAULT_PROYECTO_EDUCATIVO_CONTENT = {
  introParagraphs: PEI_INTRO.paragraphs.map((text) => ({ text, align: "justify" as const })),
};

export type ProyectoEducativoContent = {
  introParagraphs: AlignedText[];
};

export async function getProyectoEducativoContent(): Promise<ProyectoEducativoContent> {
  const stored = await getConfigValue<Partial<ProyectoEducativoContent>>("proyecto_educativo_content", {});
  return {
    introParagraphs: stored.introParagraphs
      ? normalizeParagraphs(stored.introParagraphs, "justify")
      : DEFAULT_PROYECTO_EDUCATIVO_CONTENT.introParagraphs,
  };
}
