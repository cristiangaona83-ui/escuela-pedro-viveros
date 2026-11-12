import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prematriculaSchema } from "@/lib/matricula";
import { cleanRun } from "@/lib/run";

export const runtime = "nodejs";

/**
 * Recibe la pre-matrícula que completa una familia desde el enlace público.
 * Sin sesión: la escritura la autoriza RLS (solo se puede INSERTAR en una
 * campaña abierta; nunca leer ni modificar). Acá se valida todo el formulario
 * en el servidor, se descartan los robots (campo trampa) y se guarda la ficha
 * completa junto con unas columnas resumen para la bandeja de Inspectoría.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = prematriculaSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Revisa el formulario: ${String(first?.path.slice(-1)[0] ?? "datos")} ${first?.message ?? "inválido"}` },
      { status: 400 }
    );
  }
  const { token, website, data } = parsed.data;

  // Un robot rellena el campo oculto: se responde "ok" para que no reintente, sin guardar nada.
  if (website && website.trim()) return NextResponse.json({ ok: true, code: "00000000" });

  const supabase = await createClient();
  const { data: campaign } = await supabase.from("prematricula_campaigns").select("id").eq("token", token).maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: "Este enlace de pre-matrícula no está disponible o ya cerró." }, { status: 404 });
  }

  const id = crypto.randomUUID();
  const normalized = {
    ...data,
    run: cleanRun(data.run),
    guardian: { ...data.guardian, run: cleanRun(data.guardian.run) },
    substitute: { ...data.substitute, run: data.substitute.run ? cleanRun(data.substitute.run) : "" },
  };
  const studentName = [data.first_names, data.paternal_last_name, data.maternal_last_name].filter(Boolean).join(" ");

  const { error } = await supabase.from("prematricula_requests").insert({
    id,
    campaign_id: campaign.id,
    status: "pendiente",
    student_run: normalized.run,
    student_name: studentName,
    level_requested: data.level_requested,
    admission_type: data.admission_type,
    guardian_name: data.guardian.full_name,
    guardian_phone: data.guardian.phone,
    guardian_email: data.guardian.email || null,
    data: normalized,
  });
  if (error) {
    console.error("[pre-matricula] error al guardar", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No pudimos guardar tu pre-matrícula. Inténtalo de nuevo en unos minutos." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code: id.slice(0, 8).toUpperCase() });
}
