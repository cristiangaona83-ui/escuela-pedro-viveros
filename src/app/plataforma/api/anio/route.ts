import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/features/auth/session";
import { SELECTED_YEAR_COOKIE } from "@/lib/academic-year-cookie";

export const runtime = "nodejs";

/**
 * Cambia el año de trabajo de la plataforma (selector de año de la barra
 * superior): guarda el año elegido en una cookie. Solo es una preferencia de
 * visualización de quien la elige -- no cambia el año vigente ni ningún dato,
 * y la visibilidad de cada dato la sigue decidiendo RLS.
 */
export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { yearId } = await request.json().catch(() => ({ yearId: null }));
  if (typeof yearId !== "string") return NextResponse.json({ error: "Año inválido" }, { status: 400 });

  const supabase = await createClient();
  const { data: year } = await supabase.from("academic_years").select("id, year").eq("id", yearId).maybeSingle();
  if (!year) return NextResponse.json({ error: "Año no encontrado" }, { status: 404 });

  (await cookies()).set(SELECTED_YEAR_COOKIE, year.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  return NextResponse.json({ ok: true, year: year.year });
}
