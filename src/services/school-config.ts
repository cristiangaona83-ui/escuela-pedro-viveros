import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GRADING_CONFIG, type GradingConfig } from "@/config/grading";

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
